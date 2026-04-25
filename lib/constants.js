export const CANVAS_WIDTH = 768;
export const CANVAS_HEIGHT = 1024;

export const PARTS = [
  { key: "hat", label: "모자", description: "머리 위 포인트 아이템" },
  { key: "top", label: "상의", description: "어깨부터 허리까지" },
  { key: "bottom", label: "하의", description: "허리 아래 전체" }
];

export const PART_BOXES = {
  hat: { x: 0.31, y: 0.02, width: 0.38, height: 0.15 },
  top: { x: 0.29, y: 0.19, width: 0.42, height: 0.34 },
  bottom: { x: 0.23, y: 0.5, width: 0.54, height: 0.47 }
};

export const PART_TEMPLATES = {
  hat: [
    "only one hat item",
    "transparent background",
    "alpha channel",
    "no background",
    "PNG cutout style",
    "isolated product cutout",
    "front view",
    "centered object",
    "clean edges",
    "no room",
    "no wall",
    "no floor",
    "no shadow",
    "no mannequin",
    "no human body",
    "no text",
    "no logo",
    "clean product image style"
  ],
  top: [
    "only one upper-body clothing item",
    "transparent background",
    "alpha channel",
    "no background",
    "PNG cutout style",
    "isolated product cutout",
    "front view",
    "centered object",
    "clean edges",
    "no room",
    "no wall",
    "no floor",
    "no shadow",
    "no mannequin",
    "no human body",
    "no text",
    "no logo",
    "clean product image style"
  ],
  bottom: [
    "only one lower-body clothing item",
    "transparent background",
    "alpha channel",
    "no background",
    "PNG cutout style",
    "isolated product cutout",
    "front view",
    "centered object",
    "clean edges",
    "no room",
    "no wall",
    "no floor",
    "no shadow",
    "no mannequin",
    "no human body",
    "no text",
    "no logo",
    "clean product image style"
  ]
};

export function buildGenerationPrompt(part, userPrompt) {
  return [
    `User request: ${userPrompt.trim()}`,
    "",
    "Requirements:",
    ...PART_TEMPLATES[part].map((line) => `- ${line}`)
  ].join("\n");
}

export function getPartLabel(part) {
  return PARTS.find((item) => item.key === part)?.label ?? part;
}
