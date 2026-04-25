import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const dbPath = path.join(process.cwd(), "db.sqlite");

if (!fs.existsSync(path.dirname(dbPath))) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS outfits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hat_prompt TEXT NOT NULL,
    top_prompt TEXT NOT NULL,
    bottom_prompt TEXT NOT NULL,
    composed_img_url TEXT NOT NULL,
    total_score INTEGER NOT NULL,
    popular_score INTEGER DEFAULT 0,
    mom_review TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export function createOutfit({ hatPrompt, topPrompt, bottomPrompt, composedImgUrl, totalScore, momReview }) {
  const stmt = db.prepare(`
    INSERT INTO outfits (
      hat_prompt,
      top_prompt,
      bottom_prompt,
      composed_img_url,
      total_score,
      mom_review
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(hatPrompt, topPrompt, bottomPrompt, composedImgUrl, totalScore, momReview);
  return getOutfitById(result.lastInsertRowid);
}

export function getOutfitById(id) {
  return db.prepare(`
    SELECT
      id,
      hat_prompt AS hatPrompt,
      top_prompt AS topPrompt,
      bottom_prompt AS bottomPrompt,
      composed_img_url AS composedImgUrl,
      total_score AS totalScore,
      popular_score AS popularScore,
      mom_review AS momReview,
      created_at AS createdAt
    FROM outfits
    WHERE id = ?
  `).get(id);
}

export function listOutfits(sort = "total", page = 1, limit = 4) {
  const orderBy = sort === "popular" ? "popular_score DESC, total_score DESC, id DESC" : "total_score DESC, id DESC";
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Math.min(20, Number(limit) || 4));
  const offset = (safePage - 1) * safeLimit;

  const items = db.prepare(`
    SELECT
      id,
      hat_prompt AS hatPrompt,
      top_prompt AS topPrompt,
      bottom_prompt AS bottomPrompt,
      composed_img_url AS composedImgUrl,
      total_score AS totalScore,
      popular_score AS popularScore,
      mom_review AS momReview,
      created_at AS createdAt
    FROM outfits
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `).all(safeLimit, offset);

  const totalCount = db.prepare(`SELECT COUNT(*) AS count FROM outfits`).get().count;

  return {
    items,
    page: safePage,
    limit: safeLimit,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / safeLimit))
  };
}

export function incrementPopularScore(id) {
  db.prepare(`UPDATE outfits SET popular_score = popular_score + 1 WHERE id = ?`).run(id);
  return getOutfitById(id);
}
