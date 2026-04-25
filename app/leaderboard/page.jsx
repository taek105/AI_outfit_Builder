import Link from "next/link";
import { listOutfits } from "@/lib/db";
import { UpvoteButton } from "@/components/upvote-button";

export default async function LeaderboardPage({ searchParams }) {
  const params = await searchParams;
  const sort = params?.sort === "total" ? "total" : "popular";
  const page = Number(params?.page || "1");
  const leaderboard = listOutfits(sort, page, 4);

  return (
    <main className="page-shell leaderboard-page">
      <div className="page-inner">
        <header className="hero">
          <h1>엄마 기준 랭킹</h1>
          <p>4개씩 빠르게 보고 다음 코디를 확인하세요.</p>
        </header>

        <div className="leaderboard-toolbar">
          <div className="muted small">
            page {leaderboard.page} / {leaderboard.totalPages}
          </div>
          <Link className={`btn ${sort === "popular" ? "" : "secondary"}`} href={`/leaderboard?sort=popular&page=1`}>
            인기점수순
          </Link>
          <Link className={`btn ${sort === "total" ? "" : "secondary"}`} href={`/leaderboard?sort=total&page=1`}>
            AI평가 순
          </Link>
        </div>

        <section className="grid-2x2">
          {leaderboard.items.map((outfit) => (
            <article key={outfit.id} className="panel outfit-card">
              <Link href={`/outfits/${outfit.id}`}>
                <img src={outfit.composedImgUrl} alt={`outfit ${outfit.id}`} />
              </Link>
              <div className="card-meta">
                <div className="score-badge">
                  <span className="muted small">total</span>
                  <strong>{outfit.totalScore}</strong>
                </div>
                <UpvoteButton outfitId={outfit.id} initialScore={outfit.popularScore} />
              </div>
            </article>
          ))}
        </section>

        <div className="btn-row leaderboard-actions">
          <Link
            className="btn secondary"
            href={`/leaderboard?sort=${sort}&page=${Math.max(1, leaderboard.page - 1)}`}
          >
            이전 4개
          </Link>
          <Link
            className="btn secondary"
            href={`/leaderboard?sort=${sort}&page=${Math.min(leaderboard.totalPages, leaderboard.page + 1)}`}
          >
            다음 4개
          </Link>
          <Link className="btn" href="/main">
            다시 만들기
          </Link>
        </div>
      </div>
    </main>
  );
}
