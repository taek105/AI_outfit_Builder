import { notFound } from "next/navigation";
import Link from "next/link";
import { getOutfitById } from "@/lib/db";
import { MomReviewSections } from "@/components/mom-review-sections";

export default async function OutfitDetailPage({ params }) {
  const { id } = await params;
  const outfit = getOutfitById(id);

  if (!outfit) {
    notFound();
  }

  return (
    <main className="page-shell outfit-page">
      <div className="page-inner">
        <header className="outfit-header">
          <h1>저장된 코디 기록</h1>
        </header>

        <section className="outfit-record">
          <article className="outfit-image-card">
            <img className="outfit-record-image" src={outfit.composedImgUrl} alt={`outfit ${outfit.id}`} />
          </article>

          <article className="outfit-data-card">
            <section className="outfit-score-row" aria-label="점수 조회">
              <div className="outfit-score-chip">
                <span>total</span>
                <strong>{outfit.totalScore}</strong>
              </div>
              <div className="outfit-score-chip">
                <span>popular</span>
                <strong>{outfit.popularScore}</strong>
              </div>
            </section>

            <section className="outfit-prompt-list" aria-label="입력 프롬프트">
              <div>
                <strong>모자 프롬프트</strong>
                <p>{outfit.hatPrompt}</p>
              </div>
              <div>
                <strong>상의 프롬프트</strong>
                <p>{outfit.topPrompt}</p>
              </div>
              <div>
                <strong>하의 프롬프트</strong>
                <p>{outfit.bottomPrompt}</p>
              </div>
            </section>

            <section className="outfit-review" aria-label="엄마 AI 평가">
              <strong>엄마 AI의 평가</strong>
              <MomReviewSections review={outfit.momReview} compact />
            </section>

            <Link className="outfit-back-link" href="/leaderboard">
              리더보드로 돌아가기
            </Link>
          </article>
        </section>
      </div>
    </main>
  );
}
