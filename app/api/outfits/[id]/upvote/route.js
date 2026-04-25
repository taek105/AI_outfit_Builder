import { NextResponse } from "next/server";
import { getOutfitById, incrementPopularScore } from "@/lib/db";

export async function POST(_request, { params }) {
  const { id } = await params;
  const existing = getOutfitById(id);

  if (!existing) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const updated = incrementPopularScore(id);
  return NextResponse.json({ popularScore: updated.popularScore });
}
