/* =====================================================
   POST /api/verify-submission
   Server-side spam-guard + Turnstile validation for the public
   Booking form. Returns { ok: true } when the submission looks
   human, { ok: false } when blocked.

   The client calls this BEFORE running the Supabase insert, and
   silent-fails (pretends the booking succeeded) ONLY on an explicit
   { ok: false } verdict — any other outcome fails open client-side.

   Why a Vercel serverless function for a Vite SPA?
   The booking insert happens directly from the browser via the
   Supabase anon key. Without a server hop, there's no place to
   validate Turnstile tokens (which require TURNSTILE_SECRET_KEY)
   or run server-side spam heuristics. This function is the seam.

   ⚠️ This file must stay SELF-CONTAINED (no relative imports).
   Vercel's zero-config api/ builder shipped the compiled
   `import "../lib/spam-guard"` unresolved (ERR_MODULE_NOT_FOUND at
   runtime under "type": "module"), which 500'd every call from
   2026-05-27 to 2026-09-03 — and the client's old handling mapped
   the crash to a silent block, eating every real booking. The spam
   heuristics below are inlined from lib/spam-guard.ts; keep the two
   in sync if the rules change.
   ===================================================== */

export const config = {
  runtime: "nodejs",
};

interface VerifyResponse {
  ok: boolean;
  reason?: string;
}

/* ---------- spam heuristics (inlined from lib/spam-guard.ts) ---------- */

type SpamReason =
  | "honeypot"
  | "too-fast"
  | "content-pattern"
  | "disposable-email";

const SPAM_CONTENT_PATTERNS: RegExp[] = [
  /(https?:\/\/[^\s]+[\s\S]*?){2,}/i,
  /\b(guest\s*post|link\s*building|backlinks?|seo\s*services?|rank\s*(?:higher|on\s*google))\b/i,
  /\b(crypto(?:currency)?|bitcoin|forex|nft\s*drop|payday\s*loan|quick\s*loan)\b.*\b(services?|deal|offer|opportunity)\b/i,
  /\b(viagra|cialis|cbd\s*oil|casino|escort|porn(?:hub)?)\b/i,
  /[Ѐ-ӿͰ-Ͽ؀-ۿ]{3,}/,
];

const DISPOSABLE_EMAIL_DOMAINS = new Set<string>([
  "10minutemail.com", "10minutemail.net", "20minutemail.com",
  "guerrillamail.com", "guerrillamail.net", "guerrillamail.org", "guerrillamail.biz",
  "mailinator.com", "mailinator.net",
  "tempmail.com", "temp-mail.org",
  "throwaway.email", "trashmail.com", "trashmail.net",
  "yopmail.com", "fakeinbox.com", "sharklasers.com", "spam4.me",
  "dispostable.com", "maildrop.cc", "mintemail.com", "getnada.com", "burnermail.io",
]);

function checkSpam(body: Record<string, unknown>): { blocked: boolean; reason?: SpamReason } {
  const honeypotValue = body["website"];
  if (typeof honeypotValue === "string" && honeypotValue.trim() !== "") {
    return { blocked: true, reason: "honeypot" };
  }

  const renderedAt = body["formRenderedAt"];
  if (typeof renderedAt === "number" && Number.isFinite(renderedAt)) {
    const elapsed = Date.now() - renderedAt;
    if (elapsed < 0 || elapsed < 2000) {
      return { blocked: true, reason: "too-fast" };
    }
  }

  const allText = Object.values(body)
    .filter((v): v is string => typeof v === "string")
    .join(" \n ");

  for (const pattern of SPAM_CONTENT_PATTERNS) {
    if (pattern.test(allText)) {
      return { blocked: true, reason: "content-pattern" };
    }
  }

  const email = (body.email || body.clientEmail) as unknown;
  if (typeof email === "string") {
    const domain = email.split("@")[1]?.toLowerCase().trim();
    if (domain && DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
      return { blocked: true, reason: "disposable-email" };
    }
  }

  return { blocked: false };
}

/* ---------- Cloudflare Turnstile ---------- */

async function verifyTurnstileToken(
  token: unknown,
  remoteIp?: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  // Enforce ONLY when explicitly armed. TURNSTILE_SECRET_KEY has been set in
  // Vercel since 2026-05-27, but the paired site key never reached the client
  // (it was stored as NEXT_PUBLIC_* — the Next.js prefix — in this Vite app,
  // so no widget ever rendered and no token was ever minted). Enforcing with
  // no client widget blocks 100% of real bookings. To arm Turnstile: set
  // VITE_TURNSTILE_SITE_KEY (client) AND TURNSTILE_ENFORCE=on (this check),
  // in the same deploy. The CSP and widget wiring are already in place.
  if (!secret || process.env.TURNSTILE_ENFORCE !== "on") {
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
