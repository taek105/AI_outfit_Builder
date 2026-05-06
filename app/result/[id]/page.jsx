import Link from "next/link";
import { notFound } from "next/navigation";
import { getOutfitById } from "@/lib/outfits";

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
          <h1>업로드 이미지</h1>
          <p>Git에 포함된 업로드 이미지를 확인할 수 있습니다.</p>
        </header>

        <section className="detail-grid">
          <article className="panel panel-pad detail-image">
            <a
              className="image-save-button"
              href={outfit.composedImgUrl}
              download="your_outfit.png"
              aria-label="코디 이미지로 저장"
            >
              이미지 저장
            </a>
            <img src={outfit.composedImgUrl} alt="composed outfit" />
          </article>

          <article className="panel panel-pad stack">
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
