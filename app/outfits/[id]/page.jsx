import { notFound } from "next/navigation";
import Link from "next/link";
import { getOutfitById } from "@/lib/outfits";
import { UpvoteButton } from "@/components/upvote-button";

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
              <UpvoteButton outfitId={outfit.id} initialScore={outfit.popularScore} />
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
