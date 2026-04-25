import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const SESSION_COOKIE = "mom_ai_session";
const WINDOW_MS = 5 * 60 * 60 * 1000;
const buckets = new Map();
const usedKeys = new Map();

function isSameOrigin(request) {
  const expectedHost =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    request.nextUrl.host;
  const origin = request.headers.get("origin");

  if (origin) {
    try {
      return new URL(origin).host === expectedHost;
    } catch {
      return false;
    }
  }

  const referer = request.headers.get("referer");

  if (!referer) {
    return false;
  }

  try {
    return new URL(referer).host === expectedHost;
  } catch {
    return false;
  }
}

async function getSessionId() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value || null;
}

function consumeBucket(key, limit) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (bucket.count >= limit) {
    return false;
  }

  bucket.count += 1;
  return true;
}

function consumeOnce(key) {
  const now = Date.now();
  const resetAt = usedKeys.get(key);

  if (resetAt && resetAt > now) {
    return false;
  }

  usedKeys.set(key, now + WINDOW_MS);
  return true;
}

export async function guardCostlyApi(request, { action, sessionLimit }) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "invalid request origin" }, { status: 403 });
  }

  const sessionId = await getSessionId();

  if (!sessionId) {
    return NextResponse.json({ error: "session is required" }, { status: 401 });
  }

  if (!consumeBucket(`${action}:session:${sessionId}`, sessionLimit)) {
    return NextResponse.json({ error: "session rate limit exceeded" }, { status: 429 });
  }

  return null;
}

export async function guardOncePerSession(request, { action, resourceId }) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "invalid request origin" }, { status: 403 });
  }

  const sessionId = await getSessionId();

  if (!sessionId) {
    return NextResponse.json({ error: "session is required" }, { status: 401 });
  }

  if (!consumeOnce(`${action}:session:${sessionId}:resource:${resourceId}`)) {
    return NextResponse.json({ error: "already voted" }, { status: 409 });
  }

  return null;
}
