import sharp from "sharp";
import { buildGenerationPrompt, getPartLabel } from "@/lib/constants";
import { removeBackgroundFromDataUrl } from "@/lib/remove-background.cjs";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_IMAGE_API_KEY = process.env.GEMINI_IMAGE_API_KEY;
const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-2.0-flash";
const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

function getGenerateContentEndpoint(model, apiKey) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
}

async function parseImageFromGemini(payload) {
  const parts = payload?.candidates?.flatMap((candidate) => candidate?.content?.parts || []) || [];
  const inline = parts.find((part) => part?.inlineData?.data);

  if (!inline) {
    return null;
  }

  return {
    mimeType: inline.inlineData.mimeType || "image/png",
    data: inline.inlineData.data
  };
}

async function renderMockPng(partLabel, prompt) {
  const safePrompt = prompt.slice(0, 72);
  const promptLines = [safePrompt.slice(0, 24), safePrompt.slice(24, 48), safePrompt.slice(48, 72)].filter(Boolean);
  const svg = `
    <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fff6ea" />
          <stop offset="100%" stop-color="#f1d7b3" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="transparent" />
      <ellipse cx="512" cy="512" rx="340" ry="340" fill="url(#g)" opacity="0.92" />
      <rect x="210" y="190" width="604" height="644" rx="96" fill="#fff9f1" stroke="#bb8050" stroke-width="10" />
      <text x="50%" y="380" text-anchor="middle" font-size="66" font-family="Arial" fill="#8f4d23">${partLabel}</text>
      <text x="50%" y="470" text-anchor="middle" font-size="28" font-family="Arial" fill="#6c5a45">Gemini mock fallback</text>
      ${promptLines
        .map(
          (line, index) =>
            `<text x="50%" y="${560 + (index * 42)}" text-anchor="middle" font-size="24" font-family="Arial" fill="#453524">${line
              .replaceAll("&", "&amp;")
              .replaceAll("<", "&lt;")
              .replaceAll(">", "&gt;")}</text>`
        )
        .join("\n")}
    </svg>
  `;

  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

export async function generatePartImage(part, userPrompt) {
  const finalPrompt = buildGenerationPrompt(part, userPrompt);

  if (!GEMINI_IMAGE_API_KEY) {
    const imageDataUrl = await renderMockPng(getPartLabel(part), userPrompt);

    return {
      imageDataUrl: await removeBackgroundFromDataUrl(imageDataUrl),
      finalPrompt,
      source: "mock+checker-bg-removed"
    };
  }

  const response = await fetch(getGenerateContentEndpoint(GEMINI_IMAGE_MODEL, GEMINI_IMAGE_API_KEY), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: finalPrompt }]
        }
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"]
      }
    })
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error?.message || `image generation failed: ${response.status}`);
  }

  const image = await parseImageFromGemini(payload);

  if (!image) {
    throw new Error("Gemini image payload not found");
  }

  return {
    imageDataUrl: await removeBackgroundFromDataUrl(`data:${image.mimeType};base64,${image.data}`),
    finalPrompt,
    source: "gemini+checker-bg-removed"
  };
}

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);

  if (!match) {
    return null;
  }

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function dataUrlToInlineData(dataUrl) {
  const match = dataUrl?.match(/^data:(.+);base64,(.+)$/);

  if (!match) {
    return null;
  }

  return {
    inlineData: {
      mimeType: match[1],
      data: match[2]
    }
  };
}

export async function generateMomReview(input) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is required for mom AI evaluation");
  }

  const prompt = [
    "너는 50대 한국 엄마 페르소나를 입은 패션 심사위원이다.",
    "이름은 김정숙 여사다.",
    "직설적이고 걱정이 많으며 남들 눈을 많이 의식한다.",
    "핵심 가치관: 옷은 튀려고 입는 게 아니라 남들 보기 편하게 입는 거다.",
    "평가 기준: 단정함, 노출 최소화, 색 조합 안정성, 실용성, 타인 시선.",
    "가산: 무채색, 헐렁한 옷, 꽃/자연 요소, 가디건.",
    "감점: 노출 많음, 튀는 색, 브랜드 과시, 유행 스타일.",
    "말투 예시: 엄마가 보기엔, 굳이 이렇게까지 해야 되니?, 남들 눈은 생각 안 해봤어?",
    "반드시 한국어로 답한다.",
    "첨부된 최종 합성 이미지를 실제 평가 대상으로 본다.",
    "프롬프트는 참고 정보일 뿐이고, 최종 판단은 첨부 이미지의 시각적 결과를 우선한다.",
    "프롬프트 원문을 그대로 복사하거나 나열하지 말고, 의상 특징을 엄마 관점으로 해석해서 평가한다.",
    "점수 이유에는 구체적인 산정 방식, 세부 점수, 배점, 합산 구조를 절대 언급하지 않는다.",
    "사용자에게 보이는 review에는 실루엣 점수, AI 평가 점수, 내부 계산 방식이라는 표현을 쓰지 않는다.",
    "아래 JSON 형식으로만 답한다.",
    '{ "totalScore": number, "review": "string" }',
    "",
    `모자 프롬프트: ${input.hatPrompt}`,
    `상의 프롬프트: ${input.topPrompt}`,
    `하의 프롬프트: ${input.bottomPrompt}`,
    `내부 참고값(0~30): ${input.silhouetteScore}`,
    "",
    "totalScore는 0~100 정수여야 한다.",
    "totalScore는 사용자에게 보여줄 최종 점수다.",
    "서버에서 추가 합산하지 않으므로 최종 점수를 그대로 넣는다.",
    "review는 아래 형식을 따르는 줄바꿈 포함 문자열이다.",
    "[엄마 평가]",
    "1. 엄마의 총평:",
    "2. 엄마의 상세 평가:",
    "- 모자:",
    "- 상의:",
    "- 하의:",
    "3. 엄마의 잔소리:",
    "4. 점수:",
    "- 총점:",
    "- 이유: 의상 인상과 엄마 관점의 평가만 설명한다. 세부 점수나 산정 방식은 숨긴다."
  ].join("\n");

  const imagePart = dataUrlToInlineData(input.composedImageDataUrl);
  const parts = imagePart
    ? [{ text: prompt }, imagePart]
    : [{ text: prompt }];

  const response = await fetch(getGenerateContentEndpoint(GEMINI_TEXT_MODEL, GEMINI_API_KEY), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts
        }
      ]
    })
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error?.message || `mom AI evaluation failed: ${response.status}`);
  }

  const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n") || "";
  const parsed = extractJson(text);

  if (!parsed?.review) {
    throw new Error("mom AI review payload not found");
  }

  const parsedScore = Number(parsed.totalScore);

  if (!Number.isFinite(parsedScore)) {
    throw new Error("mom AI total score payload is invalid");
  }

  const totalScore = Math.max(0, Math.min(100, parsedScore));

  return {
    review: parsed.review,
    totalScore
  };
}
