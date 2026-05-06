import { NextResponse } from "next/server";
import { listOutfits } from "@/lib/outfits";

export async function GET(request) {
  const searchParams = request.nextUrl.searchParams;
  const sort = searchParams.get("sort") || "popular";
  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "4");

  return NextResponse.json(listOutfits(sort, page, limit));
}

export async function POST() {
  return NextResponse.json(
    { error: "outfit upload API is disabled for static Vercel hosting" },
    { status: 410 }
  );
}
