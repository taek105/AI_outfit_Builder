import { NextResponse } from "next/server";
import { listOutfits } from "@/lib/db";

export async function GET(request) {
  const searchParams = request.nextUrl.searchParams;
  const sort = searchParams.get("sort") === "total" ? "total" : "popular";
  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "4");

  return NextResponse.json(listOutfits(sort, page, limit));
}
