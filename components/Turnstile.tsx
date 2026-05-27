/* =====================================================
   CLOUDFLARE TURNSTILE - Vite-compatible client widget
   No `next/script` dependency — uses vanilla script injection.

   Graceful degradation:
     - If VITE_TURNSTILE_SITE_KEY is not set, returns null (no widget,
       no error). The site keeps working before keys are wired.

   Usage:
     const [token, setToken] = useState("");
     <Turnstile onVerify={setToken} />
     ...
     fetch("/api/verify-submission", { body: JSON.stringify({ ..., turnstileToken: token }) })
   ===================================================== */

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          appearance?: "always" | "execute" | "interaction-only";
        }
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
    };
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileProps {
  onVerify: (token: string) => void;
  theme?: "light" | "dark" | "auto";
  appearance?: "always" | "execute" | "interaction-only";
  className?: string;
}

export default function Turnstile({
  onVerify,
  theme = "light",
  appearance = "interaction-only",
  className,
}: TurnstileProps) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(
    typeof window !== "undefined" && Boolean(window.turnstile),
  );

  // Vite uses VITE_ prefix for client-exposed env vars.
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

  // Inject the Turnstile script once globally
  useEffect(() => {
    if (!siteKey) return;
    if (window.turnstile) {
      setScriptLoaded(true);
      return;
    }
    if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      // Another widget already loading the script — wait for it
      const check = () => {
        if (window.turnstile) setScriptLoaded(true);
        else setTimeout(check, 100);
      };
      check();
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);
  }, [siteKey]);

  // Render the widget once script + element + key are all available
  useEffect(() => {
    if (!scriptLoaded || !siteKey || !ref.current || !window.turnstile) return;
    if (widgetId.current !== null) return; // Avoid double-render in StrictMode

    widgetId.current = window.turnstile.render(ref.current, {
      sitekey: siteKey,
      callback: (token) => onVerify(token),
      "expired-callback": () => onVerify(""),
      "error-callback": () => onVerify(""),
      theme,
      appearance,
    });

    return () => {
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {
          // Widget already removed — ignore
        }
        widgetId.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptLoaded, siteKey]);

  if (!siteKey) return null;
  return <div ref={ref} className={className} />;
}
