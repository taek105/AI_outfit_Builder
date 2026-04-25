import { NextResponse } from "next/server";
import { getOutfitById, incrementPopularScore } from "@/lib/db";
import { guardOncePerSession } from "@/lib/request-guard";

export async function POST(request, { params }) {
  const { id } = await params;
  const existing = getOutfitById(id);

  if (!existing) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const guardResponse = await guardOncePerSession(request, {
    action: "upvote",
    resourceId: id
  });

  if (guardResponse) {
    return guardResponse;
  }

  const updated = incrementPopularScore(id);
  return NextResponse.json({ popularScore: updated.popularScore });
}
