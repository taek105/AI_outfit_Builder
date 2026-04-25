import { PART_BOXES } from "@/lib/constants";

function getIntersectionArea(a, b) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);

  if (x2 <= x1 || y2 <= y1) {
    return 0;
  }

  return (x2 - x1) * (y2 - y1);
}

export function scorePart(part, placement) {
  const target = PART_BOXES[part];
  const targetArea = target.width * target.height;
  const placedArea = placement.width * placement.height;
  const insideArea = getIntersectionArea(target, placement);
  const outsideArea = Math.max(0, placedArea - insideArea);
  const fillRatio = insideArea / targetArea;
  const overflowRatio = outsideArea / targetArea;
  const raw = Math.round((fillRatio * 12) - (overflowRatio * 8));
  const score = Math.max(0, Math.min(10, raw));

  return {
    score,
    fillRatio,
    overflowRatio,
    insideArea,
    outsideArea
  };
}

export function scoreSilhouette(placements) {
  const hat = scorePart("hat", placements.hat);
  const top = scorePart("top", placements.top);
  const bottom = scorePart("bottom", placements.bottom);
  const total = hat.score + top.score + bottom.score;

  return {
    total,
    parts: {
      hat,
      top,
      bottom
    }
  };
}
