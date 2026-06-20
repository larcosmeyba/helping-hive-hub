// PostHog wrapper. No-ops gracefully when VITE_POSTHOG_KEY is missing so
// preview builds without keys don't crash. All capture goes through
// phCapture(); src/lib/analytics.ts fans existing trackEvent calls into here.
import posthog from "posthog-js";

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? "https://us.i.posthog.com";

let initialized = false;

export function initPostHog() {
  if (initialized || typeof window === "undefined") return;
  if (!KEY) return;
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: true,
    persistence: "localStorage+cookie",
    opt_out_capturing_by_default: false,
    loaded: (ph) => {
      if (import.meta.env.DEV) ph.debug();
    },
  });
  initialized = true;
}

export function isPostHogReady(): boolean {
  return initialized;
}

export function phCapture(event: string, props?: Record<string, unknown>) {
  if (!initialized) return;
  try {
    posthog.capture(event, props);
  } catch {
    /* swallow */
  }
}

export function phIdentify(userId: string, props?: Record<string, unknown>) {
  if (!initialized) return;
  try {
    posthog.identify(userId, props);
  } catch { /* */ }
}

export function phReset() {
  if (!initialized) return;
  try { posthog.reset(); } catch { /* */ }
}

export function phOptOut() {
  if (!initialized) return;
  try { posthog.opt_out_capturing(); } catch { /* */ }
}

export function phOptIn() {
  if (!initialized) return;
  try { posthog.opt_in_capturing(); } catch { /* */ }
}

export function phIsFeatureEnabled(flag: string): boolean | undefined {
  if (!initialized) return undefined;
  try { return posthog.isFeatureEnabled(flag); } catch { return undefined; }
}

export function phGetFlag(flag: string): string | boolean | undefined {
  if (!initialized) return undefined;
  try { return posthog.getFeatureFlag(flag); } catch { return undefined; }
}

export { posthog };
