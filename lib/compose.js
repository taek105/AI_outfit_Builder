import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { CANVAS_HEIGHT, CANVAS_WIDTH, PARTS } from "@/lib/constants";

function dataUrlToBuffer(dataUrl) {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);

  if (!match) {
    throw new Error("invalid image data");
  }

  return Buffer.from(match[2], "base64");
}

function silhouetteSvg() {
  return `
    <svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#fff8ef" />
          <stop offset="100%" stop-color="#ead7c0" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)" />
      <ellipse cx="384" cy="110" rx="88" ry="88" fill="#ddd1bf" opacity="0.9" />
      <path d="M278 238 C278 190 490 190 490 238 L534 414 C544 468 564 590 556 828 L212 828 C204 590 224 468 234 414 Z" fill="#d4c5b1" opacity="0.92" />
      <path d="M252 826 C254 918 224 972 174 1004 L294 1004 C304 936 312 882 316 826 Z" fill="#d4c5b1" opacity="0.92" />
      <path d="M516 826 C514 918 544 972 594 1004 L474 1004 C464 936 456 882 452 826 Z" fill="#d4c5b1" opacity="0.92" />
      <path d="M232 392 C142 430 118 502 110 582 C102 656 104 718 126 796 L202 796 C180 676 186 550 234 414 Z" fill="#d9cbb7" opacity="0.72" />
      <path d="M536 392 C626 430 650 502 658 582 C666 656 664 718 642 796 L566 796 C588 676 582 550 534 414 Z" fill="#d9cbb7" opacity="0.72" />
    </svg>
  `;
}

export async function composeOutfit({ images, placements }) {
  const composites = [];

  for (const part of PARTS) {
    const placement = placements[part.key];
    const imageData = images[part.key];
    const targetWidth = Math.max(1, Math.round(placement.width * CANVAS_WIDTH));
    const targetHeight = Math.max(1, Math.round(placement.height * CANVAS_HEIGHT));
    const targetLeft = Math.round(placement.x * CANVAS_WIDTH);
    const targetTop = Math.round(placement.y * CANVAS_HEIGHT);
    const visibleLeft = Math.max(0, targetLeft);
    const visibleTop = Math.max(0, targetTop);
    const cropLeft = Math.max(0, -targetLeft);
    const cropTop = Math.max(0, -targetTop);
    const visibleWidth = Math.min(targetWidth - cropLeft, CANVAS_WIDTH - visibleLeft);
    const visibleHeight = Math.min(targetHeight - cropTop, CANVAS_HEIGHT - visibleTop);

    if (visibleWidth <= 0 || visibleHeight <= 0) {
      continue;
    }

    const resized = await sharp(dataUrlToBuffer(imageData))
      .resize({
        width: targetWidth,
        height: targetHeight,
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .extract({
        left: cropLeft,
        top: cropTop,
        width: visibleWidth,
        height: visibleHeight
      })
      .png()
      .toBuffer();

    composites.push({
      input: resized,
      left: visibleLeft,
      top: visibleTop
    });
  }

  const base = sharp(Buffer.from(silhouetteSvg())).png();
  return base.composite(composites).png().toBuffer();
}

export async function saveComposedImage(buffer) {
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });

  const filename = `${crypto.randomUUID()}.png`;
  const filePath = path.join(uploadsDir, filename);
  await fs.writeFile(filePath, buffer);

  return `/uploads/${filename}`;
}
