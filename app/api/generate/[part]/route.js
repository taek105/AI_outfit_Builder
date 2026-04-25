import { NextResponse } from "next/server";
import { generatePartImage } from "@/lib/gemini";
import { guardCostlyApi } from "@/lib/request-guard";
import { validatePart, validatePrompt } from "@/lib/validators";

export async function POST(request, { params }) {
  const guardResponse = await guardCostlyApi(request, {
    action: "generate",
    sessionLimit: 20
  });

  if (guardResponse) {
    return guardResponse;
  }

  const { part } = await params;

  if (!validatePart(part)) {
    return NextResponse.json({ error: "invalid part" }, { status: 400 });
  }

  const body = await request.json();

  if (!validatePrompt(body?.prompt)) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  try {
    const result = await generatePartImage(part, body.prompt);

    return NextResponse.json({
      part,
      imageDataUrl: result.imageDataUrl,
      finalPrompt: result.finalPrompt,
      source: result.source
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "image generation failed" }, { status: 502 });
  }
}
