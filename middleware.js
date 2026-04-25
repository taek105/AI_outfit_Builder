import { NextResponse } from "next/server";

const SESSION_COOKIE = "mom_ai_session";

export function middleware(request) {
  console.log(`[${new Date().toISOString()}] ${request.method} ${request.nextUrl.pathname}`);

  const response = NextResponse.next();

  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    response.cookies.set(SESSION_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.COOKIE_SECURE === "true",
      maxAge: 60 * 60 * 6,
      path: "/"
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"]
};
