"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const THEME_STORAGE_KEY = "mom-ai-fashion-theme-v2";

export function PhoneShell({ children }) {
  const screenRef = useRef(null);
  const shellRef = useRef(null);
  const touchYRef = useRef(null);
  const [topPopularOutfit, setTopPopularOutfit] = useState(null);
  const [hasLoadedTopPopular, setHasLoadedTopPopular] = useState(false);
  const [theme, setTheme] = useState("light");
  const showOverview = true;

  const loadTopPopularOutfit = useCallback(async ({ showLoading = false } = {}) => {
    if (showLoading) {
      setHasLoadedTopPopular(false);
    }

    try {
      const response = await fetch("/api/leaderboard?sort=popular&page=1&limit=1", {
        cache: "no-store"
      });
      const payload = await response.json();

      setTopPopularOutfit(payload?.items?.[0] || null);
    } catch {
      setTopPopularOutfit(null);
    } finally {
      setHasLoadedTopPopular(true);
    }
  }, []);

  useEffect(() => {
    const shell = shellRef.current;
    const screen = screenRef.current;

    if (!shell || !screen) {
      return;
    }

    function isOutsideScreen(target) {
      return !screen.contains(target);
    }

    function onWheel(event) {
      if (!isOutsideScreen(event.target)) {
        return;
      }

      event.preventDefault();
      screen.scrollBy({ top: event.deltaY, left: event.deltaX });
    }

    function onTouchStart(event) {
      if (!isOutsideScreen(event.target)) {
        touchYRef.current = null;
        return;
      }

      touchYRef.current = event.touches[0]?.clientY ?? null;
    }

    function onTouchMove(event) {
      if (touchYRef.current === null || !isOutsideScreen(event.target)) {
        return;
      }

      const nextY = event.touches[0]?.clientY;

      if (nextY === undefined) {
        return;
      }

      event.preventDefault();
      screen.scrollBy({ top: touchYRef.current - nextY });
      touchYRef.current = nextY;
    }

    function onTouchEnd() {
      touchYRef.current = null;
    }

    shell.addEventListener("wheel", onWheel, { passive: false });
    shell.addEventListener("touchstart", onTouchStart, { passive: true });
    shell.addEventListener("touchmove", onTouchMove, { passive: false });
    shell.addEventListener("touchend", onTouchEnd);
    shell.addEventListener("touchcancel", onTouchEnd);

    return () => {
      shell.removeEventListener("wheel", onWheel);
      shell.removeEventListener("touchstart", onTouchStart);
      shell.removeEventListener("touchmove", onTouchMove);
      shell.removeEventListener("touchend", onTouchEnd);
      shell.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  useEffect(() => {
    if (!showOverview) {
      return;
    }

    function onOutfitUpvoted() {
      loadTopPopularOutfit();
    }

    loadTopPopularOutfit({ showLoading: true });
    window.addEventListener("outfit-upvoted", onOutfitUpvoted);

    return () => {
      window.removeEventListener("outfit-upvoted", onOutfitUpvoted);
    };
  }, [loadTopPopularOutfit, showOverview]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

    if (savedTheme === "dark") {
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.dataset.theme = "dark";
      window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
      return;
    }

    delete document.documentElement.dataset.theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  return (
    <div ref={shellRef} className={`app-shell ${showOverview ? "app-shell-overview" : ""}`}>
      <button
        className="theme-toggle"
        type="button"
        aria-pressed={theme === "dark"}
        onClick={toggleTheme}
      >
        {theme === "dark" ? "라이트 테마" : "다크 테마"}
      </button>
      {showOverview ? (
        <aside className="service-overview" aria-label="서비스 개요">
          <h2>AI로 만들고, <br /> 직접 입혀보고, <br /> 엄마 AI한테 평가받으세요.</h2>
          <p>
            {/* 모자, 상의, 하의를 프롬프트로 생성한 뒤 실루엣 위에 배치해 하나의 코디로 합성합니다.
            완성된 이미지는 엄마 AI의 기준으로 평가되고 리더보드에 저장됩니다. */}
            LLM API는 작동하지 않습니다.
          </p>
          <section className="popular-spotlight" aria-label="현재 인기투표 1등 패션">
            <div className="popular-spotlight-heading">
              <span>현재 인기투표 1등</span>
              {topPopularOutfit ? <strong>👍 {topPopularOutfit.popularScore}</strong> : null}
            </div>
            {topPopularOutfit ? (
              <a className="popular-spotlight-card" href={`/outfits/${topPopularOutfit.id}`}>
                <img src={topPopularOutfit.composedImgUrl} alt={`인기투표 1등 outfit ${topPopularOutfit.id}`} />
                <div>
                  <span>total</span>
                  <strong>{topPopularOutfit.totalScore}</strong>
                </div>
              </a>
            ) : (
              <p className="popular-spotlight-empty">
                {hasLoadedTopPopular ? "아직 저장된 패션이 없습니다." : "인기 패션을 불러오는 중입니다."}
              </p>
            )}
          </section>
        </aside>
      ) : null}
      <div className="phone-frame">
        <div className="phone-notch" />
        <div ref={screenRef} className="phone-screen">
          <div className="phone-content">{children}</div>
        </div>
      </div>
    </div>
  );
}
