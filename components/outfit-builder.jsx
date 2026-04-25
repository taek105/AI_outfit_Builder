"use client";

import { useDeferredValue, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CANVAS_HEIGHT, CANVAS_WIDTH, PART_BOXES, PARTS } from "@/lib/constants";
import { scoreSilhouette } from "@/lib/scoring";

const CANVAS_RATIO = CANVAS_WIDTH / CANVAS_HEIGHT;

const defaultPlacements = {
  hat: { x: 0.33, y: 0.04, width: 0.34, height: 0.1 },
  top: { x: 0.31, y: 0.23, width: 0.38, height: 0.27 },
  bottom: { x: 0.27, y: 0.54, width: 0.46, height: 0.39 }
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getImageAspectRatio(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image.width / image.height || 1);
    image.onerror = reject;
    image.src = dataUrl;
  });
}

function fitPlacementToPartBox(part, aspectRatio) {
  const box = PART_BOXES[part];
  let width = box.width * 0.92;
  let height = (width * CANVAS_RATIO) / aspectRatio;

  if (height > box.height * 1.05) {
    height = box.height * 1.05;
    width = (height * aspectRatio) / CANVAS_RATIO;
  }

  return {
    x: box.x + ((box.width - width) / 2),
    y: box.y + ((box.height - height) / 2),
    width,
    height
  };
}

function getFreeResizedPlacement(placement, nextWidth, nextHeight) {
  const width = clamp(nextWidth, 0.08, 1.2);
  const height = clamp(nextHeight, 0.06, 1.2);

  return {
    ...placement,
    width,
    height
  };
}

export function OutfitBuilder() {
  const router = useRouter();
  const [activePart, setActivePart] = useState("hat");
  const [parts, setParts] = useState({
    hat: { prompt: "", imageDataUrl: "", finalPrompt: "", source: "", aspectRatio: 1 },
    top: { prompt: "", imageDataUrl: "", finalPrompt: "", source: "", aspectRatio: 1 },
    bottom: { prompt: "", imageDataUrl: "", finalPrompt: "", source: "", aspectRatio: 1 }
  });
  const [placements, setPlacements] = useState(defaultPlacements);
  const [lockedParts, setLockedParts] = useState({});
  const [status, setStatus] = useState("각 파트 이미지를 생성한 뒤 실루엣에 맞춰 드래그해 배치하세요.");
  const [dragState, setDragState] = useState(null);
  const [isGenerating, startGenerating] = useTransition();
  const [isSubmitting, startSubmitting] = useTransition();
  const canvasRef = useRef(null);

  const previewScore = scoreSilhouette(placements);
  const deferredScore = useDeferredValue(previewScore);

  function updatePrompt(part, prompt) {
    setParts((current) => ({
      ...current,
      [part]: {
        ...current[part],
        prompt
      }
    }));
  }

  function clearPart(part) {
    setParts((current) => ({
      ...current,
      [part]: {
        ...current[part],
        imageDataUrl: "",
        finalPrompt: "",
        source: "",
        aspectRatio: 1
      }
    }));
    setPlacements((current) => ({
      ...current,
      [part]: defaultPlacements[part]
    }));
    setLockedParts((current) => ({
      ...current,
      [part]: false
    }));
    setStatus(`${PARTS.find((item) => item.key === part)?.label} 이미지를 삭제했습니다.`);
  }

  function startMove(event, part) {
    if (!parts[part].imageDataUrl || lockedParts[part] || !canvasRef.current) {
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const placement = placements[part];
    const offsetX = (event.clientX - rect.left) / rect.width - placement.x;
    const offsetY = (event.clientY - rect.top) / rect.height - placement.y;
    setActivePart(part);
    setDragState({ part, mode: "move", offsetX, offsetY });
  }

  function startResize(event, part) {
    if (!parts[part].imageDataUrl || lockedParts[part] || !canvasRef.current) {
      return;
    }

    event.stopPropagation();
    const rect = canvasRef.current.getBoundingClientRect();
    setActivePart(part);
    setDragState({
      part,
      mode: "resize",
      startX: (event.clientX - rect.left) / rect.width,
      startY: (event.clientY - rect.top) / rect.height,
      startWidth: placements[part].width,
      startHeight: placements[part].height
    });
  }

  function moveDrag(event) {
    if (!dragState || lockedParts[dragState.part] || !canvasRef.current) {
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const pointerX = (event.clientX - rect.left) / rect.width;
    const pointerY = (event.clientY - rect.top) / rect.height;

    if (dragState.mode === "move") {
      const nextX = pointerX - dragState.offsetX;
      const nextY = pointerY - dragState.offsetY;

      setPlacements((current) => ({
        ...current,
        [dragState.part]: {
          ...current[dragState.part],
          x: clamp(nextX, -current[dragState.part].width + 0.04, 0.96),
          y: clamp(nextY, -current[dragState.part].height + 0.04, 0.96)
        }
      }));
      return;
    }

    const deltaX = pointerX - dragState.startX;
    const deltaY = pointerY - dragState.startY;
    const nextWidth = dragState.startWidth + deltaX;
    const nextHeight = dragState.startHeight + deltaY;

    setPlacements((current) => ({
      ...current,
      [dragState.part]: getFreeResizedPlacement(current[dragState.part], nextWidth, nextHeight)
    }));
  }

  function endDrag() {
    if (dragState) {
      setStatus("배치를 조정했습니다. 점수 미리보기를 확인한 뒤 제출할 수 있습니다.");
    }

    setDragState(null);
  }

  async function handleGenerate(part) {
    const prompt = parts[part].prompt.trim();

    if (!prompt) {
      setStatus("프롬프트를 먼저 입력하세요.");
      return;
    }

    startGenerating(async () => {
      setStatus(`${PARTS.find((item) => item.key === part)?.label} 이미지를 생성 중입니다.`);

      const response = await fetch(`/api/generate/${part}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt })
      });

      const payload = await response.json();

      if (!response.ok) {
        setStatus(payload.error ? payload.error.slice(0, 120) : "이미지 생성에 실패했습니다.");
        return;
      }

      const aspectRatio = await getImageAspectRatio(payload.imageDataUrl).catch(() => 1);
      const fittedPlacement = fitPlacementToPartBox(part, aspectRatio);

      setParts((current) => ({
        ...current,
        [part]: {
          ...current[part],
          imageDataUrl: payload.imageDataUrl,
          finalPrompt: payload.finalPrompt,
          source: payload.source,
          aspectRatio
        }
      }));
      setPlacements((current) => ({
        ...current,
        [part]: fittedPlacement
      }));
      setLockedParts((current) => ({
        ...current,
        [part]: false
      }));
      setActivePart(part);
      setStatus(`${PARTS.find((item) => item.key === part)?.label} 이미지가 준비됐습니다. 실루엣에 맞춰 배치하세요.`);
    });
  }

  function togglePartLock(part) {
    const label = PARTS.find((item) => item.key === part)?.label;
    const nextLocked = !lockedParts[part];

    setLockedParts((current) => ({
      ...current,
      [part]: nextLocked
    }));
    setStatus(nextLocked ? `${label} 위치를 고정했습니다.` : `${label} 위치 고정을 해제했습니다.`);
    setDragState(null);
  }

  function handleSubmit() {
    const ready = PARTS.every((part) => parts[part.key].imageDataUrl && parts[part.key].prompt.trim());

    if (!ready) {
      setStatus("모자, 상의, 하의 이미지를 모두 생성해야 합니다.");
      return;
    }

    startSubmitting(async () => {
      setStatus("합성 이미지와 엄마 AI 평가를 생성 중입니다.");

      const response = await fetch("/api/outfits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompts: {
            hat: parts.hat.prompt,
            top: parts.top.prompt,
            bottom: parts.bottom.prompt
          },
          images: {
            hat: parts.hat.imageDataUrl,
            top: parts.top.imageDataUrl,
            bottom: parts.bottom.imageDataUrl
          },
          placements
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        setStatus(payload.error || "제출에 실패했습니다.");
        return;
      }

      router.push(`/result/${payload.id}`);
    });
  }

  return (
    <div className="two-column">
      <aside className="canvas-panel panel canvas-shell">
        <div
          ref={canvasRef}
          className="canvas-wrap"
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
        >
          <svg className="silhouette-shape" viewBox="0 0 768 1024" aria-hidden="true">
            <ellipse cx="384" cy="110" rx="88" ry="88" fill="#ddd1bf" opacity="0.9" />
            <path
              d="M278 238 C278 190 490 190 490 238 L534 414 C544 468 564 590 556 828 L212 828 C204 590 224 468 234 414 Z"
              fill="#d4c5b1"
              opacity="0.92"
            />
            <path d="M252 826 C254 918 224 972 174 1004 L294 1004 C304 936 312 882 316 826 Z" fill="#d4c5b1" opacity="0.92" />
            <path d="M516 826 C514 918 544 972 594 1004 L474 1004 C464 936 456 882 452 826 Z" fill="#d4c5b1" opacity="0.92" />
            <path d="M232 392 C142 430 118 502 110 582 C102 656 104 718 126 796 L202 796 C180 676 186 550 234 414 Z" fill="#d9cbb7" opacity="0.72" />
            <path d="M536 392 C626 430 650 502 658 582 C666 656 664 718 642 796 L566 796 C588 676 582 550 534 414 Z" fill="#d9cbb7" opacity="0.72" />
          </svg>

          {PARTS.map((part) => {
            const box = PART_BOXES[part.key];
            const placement = placements[part.key];
            const hasImage = parts[part.key].imageDataUrl;
            const isLocked = Boolean(lockedParts[part.key]);

            return (
              <div key={part.key}>
                <div
                  className={`target-box ${activePart === part.key ? "active" : ""}`}
                  style={{
                    left: `${box.x * 100}%`,
                    top: `${box.y * 100}%`,
                    width: `${box.width * 100}%`,
                    height: `${box.height * 100}%`
                  }}
                />

                {hasImage ? (
                  <div
                    className={`placed-item ${activePart === part.key ? "active" : ""} ${isLocked ? "locked" : ""}`}
                    style={{
                      left: `${placement.x * 100}%`,
                      top: `${placement.y * 100}%`,
                      width: `${placement.width * 100}%`,
                      height: `${placement.height * 100}%`
                    }}
                    onPointerDown={(event) => startMove(event, part.key)}
                  >
                    <img src={parts[part.key].imageDataUrl} alt={part.label} />
                    <button
                      className="placed-item-delete"
                      type="button"
                      aria-label={`${part.label} 삭제`}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => clearPart(part.key)}
                    >
                      ×
                    </button>
                    <button
                      className="placed-item-lock"
                      type="button"
                      aria-pressed={isLocked}
                      aria-label={`${part.label} ${isLocked ? "고정 해제" : "위치 고정"}`}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => togglePartLock(part.key)}
                    >
                      ✓
                    </button>
                    {isLocked ? null : (
                      <button
                        className="placed-item-resize"
                        type="button"
                        aria-label={`${part.label} 크기 조절`}
                        onPointerDown={(event) => startResize(event, part.key)}
                      />
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

      </aside>

      <section className="panel panel-pad stack">
        {PARTS.map((part) => (
          <article key={part.key} className={`part-card ${activePart === part.key ? "active" : ""}`}>
            <div>
              <h3>{part.label}</h3>
              <p className="muted small">{part.description}</p>
            </div>

            <div className="part-preview">
              {parts[part.key].imageDataUrl ? (
                <img src={parts[part.key].imageDataUrl} alt={`${part.label} preview`} />
              ) : (
                <span className="muted small">생성 전</span>
              )}
            </div>

            <textarea
              placeholder={`${part.label} 스타일을 자연어로 입력`}
              value={parts[part.key].prompt}
              onChange={(event) => updatePrompt(part.key, event.target.value)}
            />

            <div className="btn-row">
              <button className="btn" type="button" disabled={isGenerating} onClick={() => handleGenerate(part.key)}>
                {isGenerating && activePart === part.key ? "생성 중..." : `${part.label} 생성`}
              </button>
            </div>

            {parts[part.key].finalPrompt ? (
              <p className="small muted">source: {parts[part.key].source}</p>
            ) : null}
          </article>
        ))}

        <div className="status-box">{status}</div>

        <div className="btn-row">
          <button className="btn" type="button" disabled={isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? "제출 중..." : "패션 대회 참가"}
          </button>
          <a className="btn secondary" href="/leaderboard">
            리더보드 보기
          </a>
        </div>
      </section>
    </div>
  );
}
