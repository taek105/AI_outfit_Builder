import Link from "next/link";
import { notFound } from "next/navigation";
import { getOutfitById } from "@/lib/db";
import { MomReviewSections } from "@/components/mom-review-sections";

export default async function ResultPage({ params }) {
  const { id } = await params;
  const outfit = getOutfitById(id);

  if (!outfit) {
    notFound();
  }

  return (
    <main className="page-shell">
      <div className="page-inner">
        <header className="hero">
          <h1>{outfit.totalScore}점, 엄마 AI 판정 완료</h1>
          <p>총점과 엄마의 코멘트를 먼저 확인하고, 리더보드나 상세 페이지로 이동할 수 있습니다.</p>
        </header>

        <section className="detail-grid">
          <article className="panel panel-pad detail-image">
            <img src={outfit.composedImgUrl} alt="composed outfit" />
          </article>

          <article className="panel panel-pad stack">
            <div className="score-badge score-badge-large">
              <span className="muted">총점</span>
              <strong>{outfit.totalScore}</strong>
              <span className="muted">/ 100</span>
            </div>
            <MomReviewSections review={outfit.momReview} />
            <div className="btn-row">
              <Link className="btn" href="/leaderboard">
                리더보드 이동
              </Link>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
