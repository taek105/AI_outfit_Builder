import Link from "next/link";
import { NotFoundRedirect } from "@/components/not-found-redirect";

export default function NotFoundPage() {
  return (
    <main className="page-shell not-found-page">
      <NotFoundRedirect />
      <div className="page-inner">
        <section className="panel panel-pad not-found-panel">
          <span className="eyebrow">404</span>
          <h1>페이지를 찾을 수 없습니다</h1>
          <p>잠시 후 AI 옷입히기 메인으로 이동합니다.</p>
          <Link className="btn" href="/main">
            메인으로 이동
          </Link>
        </section>
      </div>
    </main>
  );
}
