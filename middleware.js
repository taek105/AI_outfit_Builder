import { NextResponse } from "next/server";

const SESSION_COOKIE = "mom_ai_session";

export function middleware(request) {
  const response = NextResponse.next();

  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    response.cookies.set(SESSION_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 6,
      path: "/"
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"]
};
