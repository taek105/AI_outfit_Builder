import { PARTS } from "@/lib/constants";

function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

export function validatePart(part) {
  return PARTS.some((item) => item.key === part);
}

export function validatePrompt(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function validatePlacement(value) {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    isNumber(value.x) &&
    isNumber(value.y) &&
    isNumber(value.width) &&
    isNumber(value.height) &&
    value.x >= -1.5 &&
    value.x <= 1.5 &&
    value.y >= -1.5 &&
    value.y <= 1.5 &&
    value.width > 0 &&
    value.width <= 1.5 &&
    value.height > 0 &&
    value.height <= 1.5
  );
}

export function validateImageData(value) {
  return typeof value === "string" && value.startsWith("data:image/");
}

export function normalizePlacements(input) {
  const placements = {};

  for (const part of PARTS) {
    if (!validatePlacement(input?.[part.key])) {
      throw new Error(`${part.key} placement is invalid`);
    }

    placements[part.key] = {
      x: input[part.key].x,
      y: input[part.key].y,
      width: input[part.key].width,
      height: input[part.key].height
    };
  }

  return placements;
}
