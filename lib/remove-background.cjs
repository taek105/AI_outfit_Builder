const sharp = require("sharp");

const MAX_OUTPUT_SIZE = 512;

function dataUrlToBuffer(dataUrl) {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);

  if (!match) {
    throw new Error("invalid image data");
  }

  return Buffer.from(match[2], "base64");
}

function colorDistanceSq(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];

  return (dr * dr) + (dg * dg) + (db * db);
}

function getPixelStats(data, index) {
  const r = data[index];
  const g = data[index + 1];
  const b = data[index + 2];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  const luminance = (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
  const saturation = max === 0 ? 0 : chroma / max;

  return { chroma, luminance, saturation };
}

function isStrongForeground(data, pixel) {
  const index = pixel * 4;

  if (data[index + 3] <= 8) {
    return false;
  }

  const { chroma, luminance, saturation } = getPixelStats(data, index);

  return chroma > 24 || saturation > 0.18 || luminance < 185;
}

function buildForegroundBarrier(data, width, height) {
  let barrier = new Uint8Array(width * height);

  for (let pixel = 0; pixel < barrier.length; pixel += 1) {
    if (isStrongForeground(data, pixel)) {
      barrier[pixel] = 1;
    }
  }

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const next = new Uint8Array(barrier);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const pixel = (y * width) + x;

        if (!barrier[pixel]) {
          continue;
        }

        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
              next[(ny * width) + nx] = 1;
            }
          }
        }
      }
    }

    barrier = next;
  }

  return barrier;
}

function addPaletteColor(palette, color) {
  const duplicate = palette.some((item) => colorDistanceSq(item, color) < 64);

  if (!duplicate) {
    palette.push(color);
  }
}

function buildCheckerPalette(data, width, height) {
  const palette = [];
  const sample = (x, y) => {
    const index = ((y * width) + x) * 4;

    if (data[index + 3] <= 8) {
      return;
    }

    addPaletteColor(palette, [data[index], data[index + 1], data[index + 2]]);
  };

  for (let x = 0; x < width; x += 2) {
    sample(x, 0);
    sample(x, height - 1);
  }

  for (let y = 0; y < height; y += 2) {
    sample(0, y);
    sample(width - 1, y);
  }

  return palette.slice(0, 8);
}

function isCheckerBackground(data, pixel, palette) {
  const index = pixel * 4;

  if (data[index + 3] <= 8) {
    return true;
  }

  const color = [data[index], data[index + 1], data[index + 2]];
  const thresholdSq = 34 * 34;

  return palette.some((item) => colorDistanceSq(item, color) <= thresholdSq);
}

function findConnectedCheckerBackground(data, width, height, palette, barrier) {
  const background = new Uint8Array(width * height);
  const queue = [];
  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return;
    }

    const pixel = (y * width) + x;

    if (background[pixel] || barrier[pixel] || !isCheckerBackground(data, pixel, palette)) {
      return;
    }

    background[pixel] = 1;
    queue.push(pixel);
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }

  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const pixel = queue[cursor];
    const x = pixel % width;
    const y = Math.floor(pixel / width);

    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  return background;
}

function keepOnlyOutsideBackground(background, width, height) {
  const outside = new Uint8Array(width * height);
  const queue = [];
  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return;
    }

    const pixel = (y * width) + x;

    if (!background[pixel] || outside[pixel]) {
      return;
    }

    outside[pixel] = 1;
    queue.push(pixel);
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }

  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const pixel = queue[cursor];
    const x = pixel % width;
    const y = Math.floor(pixel / width);

    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  return outside;
}

function applyBackgroundMask(data, width, height, background) {
  const output = Buffer.from(data);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = (y * width) + x;
      const index = pixel * 4;

      if (background[pixel]) {
        output[index + 3] = 0;
        continue;
      }

      let backgroundNeighbors = 0;

      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) {
            continue;
          }

          const nx = x + dx;
          const ny = y + dy;

          if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
            continue;
          }

          if (background[(ny * width) + nx]) {
            backgroundNeighbors += 1;
          }
        }
      }

      if (backgroundNeighbors > 0) {
        output[index + 3] = Math.max(0, output[index + 3] - (backgroundNeighbors * 14));
      }
    }
  }

  return output;
}

async function removeBackgroundFromBuffer(inputBuffer, { maxSize = MAX_OUTPUT_SIZE } = {}) {
  const image = sharp(inputBuffer)
    .rotate()
    .resize({
      width: maxSize,
      height: maxSize,
      fit: "inside",
      withoutEnlargement: true
    })
    .ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const palette = buildCheckerPalette(data, info.width, info.height);
  const barrier = buildForegroundBarrier(data, info.width, info.height);
  const background = keepOnlyOutsideBackground(
    findConnectedCheckerBackground(data, info.width, info.height, palette, barrier),
    info.width,
    info.height
  );
  const output = applyBackgroundMask(data, info.width, info.height, background);

  return sharp(output, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

async function removeBackgroundFromDataUrl(dataUrl, options) {
  const output = await removeBackgroundFromBuffer(dataUrlToBuffer(dataUrl), options);

  return `data:image/png;base64,${output.toString("base64")}`;
}

module.exports = {
  removeBackgroundFromBuffer,
  removeBackgroundFromDataUrl
};
