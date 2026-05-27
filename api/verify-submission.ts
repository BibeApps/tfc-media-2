/* =====================================================
   POST /api/verify-submission
   Server-side spam-guard + Turnstile validation for the public
   Booking form. Returns { ok: true } when the submission looks
   human, { ok: false } when blocked.

   The client calls this BEFORE running the Supabase insert, and
   silent-fails (pretends the booking succeeded) when ok === false.

   Why a Vercel serverless function for a Vite SPA?
   The booking insert happens directly from the browser via the
   Supabase anon key. Without a server hop, there's no place to
   validate Turnstile tokens (which require TURNSTILE_SECRET_KEY)
   or run server-side spam heuristics. This function is the seam.
   ===================================================== */

import { checkSpam } from "../lib/spam-guard";

// Vercel function — works with both `req: Request` (Edge/Web) and the
// older Node IncomingMessage shape. We use the Web API shape because
// it's cleaner and works in either runtime.
export const config = {
  runtime: "nodejs",
};

interface VerifyResponse {
  ok: boolean;
  reason?: string;
}

async function verifyTurnstileToken(
  token: unknown,
  remoteIp?: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // No secret configured → skip Turnstile verification (graceful).
    return true;
  }
  if (typeof token !== "string" || token.length === 0) return false;

  const params = new URLSearchParams();
  params.append("secret", secret);
  params.append("response", token);
  if (remoteIp) params.append("remoteip", remoteIp);

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: params },
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return Response.json({ ok: false, reason: "method-not-allowed" }, { status: 405 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, reason: "invalid-json" }, { status: 400 });
  }

  // 1. Heuristic spam guard
  const verdict = checkSpam(body);
  if (verdict.blocked) {
    console.warn(`[verify-submission spam-guard] blocked reason=${verdict.reason}`);
    const resp: VerifyResponse = { ok: false, reason: verdict.reason };
    return Response.json(resp, { status: 200 });
  }

  // 2. Cloudflare Turnstile (no-op if secret missing)
  const remoteIp =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    undefined;
  const turnstileOk = await verifyTurnstileToken(body.turnstileToken, remoteIp);
  if (!turnstileOk) {
    console.warn("[verify-submission turnstile] verification failed");
    const resp: VerifyResponse = { ok: false, reason: "turnstile-failed" };
    return Response.json(resp, { status: 200 });
  }

  return Response.json({ ok: true } satisfies VerifyResponse, { status: 200 });
}
