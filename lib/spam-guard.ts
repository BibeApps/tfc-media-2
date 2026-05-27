/* =====================================================
   SPAM GUARD - TFC Media Group
   Used by both the client (soft-block before submit) and the
   Vercel /api/verify-submission function (hard server-side block).
   See @/api/verify-submission.ts.
   ===================================================== */

export interface SpamGuardOptions {
  honeypotField?: string;
  minSubmitTimeMs?: number;
  timestampField?: string;
  skipTimeTrap?: boolean;
}

export interface SpamCheckResult {
  blocked: boolean;
  reason?:
    | "honeypot"
    | "too-fast"
    | "content-pattern"
    | "disposable-email"
    | "missing-fields";
}

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

export function checkSpam(
  body: Record<string, unknown>,
  opts: SpamGuardOptions = {}
): SpamCheckResult {
  const {
    honeypotField = "website",
    minSubmitTimeMs = 2000,
    timestampField = "formRenderedAt",
    skipTimeTrap = false,
  } = opts;

  const honeypotValue = body[honeypotField];
  if (typeof honeypotValue === "string" && honeypotValue.trim() !== "") {
    return { blocked: true, reason: "honeypot" };
  }

  if (!skipTimeTrap) {
    const renderedAt = body[timestampField];
    if (typeof renderedAt === "number" && Number.isFinite(renderedAt)) {
      const elapsed = Date.now() - renderedAt;
      if (elapsed < 0 || elapsed < minSubmitTimeMs) {
        return { blocked: true, reason: "too-fast" };
      }
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

export const honeypotStyle: React.CSSProperties = {
  position: "absolute",
  left: "-10000px",
  top: "auto",
  width: "1px",
  height: "1px",
  overflow: "hidden",
  opacity: 0,
  pointerEvents: "none",
};
