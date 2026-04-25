import { NextResponse } from "next/server";
import { composeOutfit, saveComposedImage } from "@/lib/compose";
import { createOutfit } from "@/lib/db";
import { generateMomReview } from "@/lib/gemini";
import { guardCostlyApi } from "@/lib/request-guard";
import { scoreSilhouette } from "@/lib/scoring";
import { normalizePlacements, validateImageData, validatePrompt } from "@/lib/validators";

export async function POST(request) {
  const guardResponse = await guardCostlyApi(request, {
    action: "outfit",
    sessionLimit: 10
  });

  if (guardResponse) {
    return guardResponse;
  }

  const body = await request.json();

  const prompts = body?.prompts || {};
  const images = body?.images || {};

  if (![prompts.hat, prompts.top, prompts.bottom].every(validatePrompt)) {
    return NextResponse.json({ error: "all prompts are required" }, { status: 400 });
  }

  if (![images.hat, images.top, images.bottom].every(validateImageData)) {
    return NextResponse.json({ error: "all generated images are required" }, { status: 400 });
  }

  let placements;

  try {
    placements = normalizePlacements(body?.placements);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const silhouette = scoreSilhouette(placements);
  const imageBuffer = await composeOutfit({ images, placements });
  const composedImgUrl = await saveComposedImage(imageBuffer);
  let reviewResult;

  try {
    reviewResult = await generateMomReview({
      hatPrompt: prompts.hat,
      topPrompt: prompts.top,
      bottomPrompt: prompts.bottom,
      silhouetteScore: silhouette.total,
      composedImageDataUrl: `data:image/png;base64,${imageBuffer.toString("base64")}`
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "mom AI evaluation failed" }, { status: 502 });
  }

  const outfit = createOutfit({
    hatPrompt: prompts.hat,
    topPrompt: prompts.top,
    bottomPrompt: prompts.bottom,
    composedImgUrl,
    totalScore: reviewResult.totalScore,
    momReview: reviewResult.review
  });

  return NextResponse.json({
    id: outfit.id,
    composedImgUrl: outfit.composedImgUrl,
    totalScore: outfit.totalScore,
    momReview: outfit.momReview
  });
}
