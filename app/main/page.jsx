import { OutfitBuilder } from "@/components/outfit-builder";

export default function MainPage() {
  return (
    <main className="page-shell">
      <div className="page-inner">
        <header className="hero">
          <h1>AI 옷입히기</h1>
          <p>
            모자, 상의, 하의를 생성하고 직접 실루엣 위에 배치하세요.
            <br />
            실루엣 적합도와 엄마 AI를 통해 점수를 산출합니다.
          </p>
        </header>

        <OutfitBuilder />
      </div>
    </main>
  );
}
