import fs from "node:fs";
import path from "node:path";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
const IMAGE_EXTENSIONS = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".webp"]);
const POPULAR_SCORE_OVERRIDES = {
  "63c45b72-ac38-47b3-aa27-ec075245a6df": 13
};

function filenameToId(filename) {
  return path.parse(filename).name;
}

function idToImageUrl(id, filename) {
  return `/uploads/${filename || `${id}.png`}`;
}

function getDefaultPopularScore(id) {
  if (Object.hasOwn(POPULAR_SCORE_OVERRIDES, id)) {
    return POPULAR_SCORE_OVERRIDES[id];
  }

  return [...id].reduce((score, char) => score + char.charCodeAt(0), 0) % 4;
}

function listUploadedImages() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    return [];
  }

  return fs
    .readdirSync(UPLOADS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => {
      const stats = fs.statSync(path.join(UPLOADS_DIR, entry.name));
      const id = filenameToId(entry.name);

      return {
        id,
        hatPrompt: "",
        topPrompt: "",
        bottomPrompt: "",
        composedImgUrl: idToImageUrl(id, entry.name),
        totalScore: 0,
        popularScore: getDefaultPopularScore(id),
        momReview: "",
        createdAt: stats.mtime.toISOString()
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getOutfitById(id) {
  const safeId = String(id || "");
  return listUploadedImages().find((outfit) => outfit.id === safeId);
}

export function listOutfits(_sort = "popular", page = 1, limit = 4) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Math.min(20, Number(limit) || 4));
  const items = [...listUploadedImages()].sort((a, b) => {
    if (_sort === "total") {
      return b.totalScore - a.totalScore || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }

    return b.popularScore - a.popularScore || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / safeLimit));
  const currentPage = Math.min(safePage, totalPages);
  const offset = (currentPage - 1) * safeLimit;

  return {
    items: items.slice(offset, offset + safeLimit),
    page: currentPage,
    limit: safeLimit,
    totalCount,
    totalPages
  };
}
