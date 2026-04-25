import { NextResponse } from "next/server";
import { getOutfitById } from "@/lib/db";

export async function GET(_request, { params }) {
  const { id } = await params;
  const outfit = getOutfitById(id);

  if (!outfit) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json(outfit);
}
