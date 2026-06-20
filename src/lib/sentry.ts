// Sentry init. No-op when VITE_SENTRY_DSN is missing or in dev (unless
// explicitly enabled). Coexists with src/lib/errorLogger.ts (activity_logs).
import * as Sentry from "@sentry/react";

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const ENV =
  (import.meta.env.VITE_SENTRY_ENVIRONMENT as string | undefined) ??
  (import.meta.env.MODE as string | undefined) ??
  "development";
const RELEASE = (import.meta.env.VITE_APP_RELEASE as string | undefined) ?? "dev";

let initialized = false;

function isPlaceholderDsn(dsn?: string): boolean {
  if (!dsn) return true;
  if (!/^https?:\/\//i.test(dsn)) return true;
  if (dsn.includes("YOUR_") || dsn.includes("example")) return true;
  return false;
}

// Scrub keys that commonly carry tokens/PII from event payloads.
const SENSITIVE_KEY = /(token|authorization|apikey|api_key|password|secret|email|cookie|set-cookie|jwt)/i;
function scrub<T>(value: T): T {
  if (!value || typeof value !== "object") return value;
  try {
    const copy: any = Array.isArray(value) ? [...(value as any)] : { ...(value as any) };
    for (const k of Object.keys(copy)) {
      if (SENSITIVE_KEY.test(k)) copy[k] = "[scrubbed]";
      else if (typeof copy[k] === "object") copy[k] = scrub(copy[k]);
    }
    return copy as T;
  } catch {
    return value;
  }
}

export function initSentry() {
  if (initialized) return;
  if (isPlaceholderDsn(DSN)) return;
  if (import.meta.env.DEV && ENV === "development") return; // off in local dev by default

  Sentry.init({
    dsn: DSN,
    environment: ENV,
    release: RELEASE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    ],
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0,
    sendDefaultPii: false,
    beforeSend(event) {
      if (isPlaceholderDsn(DSN)) return null;
      if (event.request) event.request = scrub(event.request);
      if (event.extra) event.extra = scrub(event.extra);
      if (event.contexts) event.contexts = scrub(event.contexts) as any;
      return event;
    },
  });
  initialized = true;
}

export function sentryCapture(error: unknown, context?: Record<string, unknown>) {
  if (!initialized) return;
  try {
    Sentry.captureException(error, context ? { contexts: { extra: scrub(context) } as any } : undefined);
  } catch { /* */ }
}

export function sentrySetUser(user: { id: string; email?: string } | null) {
  if (!initialized) return;
  try {
    if (!user) Sentry.setUser(null);
    else Sentry.setUser({ id: user.id }); // intentionally omit email
  } catch { /* */ }
}

export { Sentry };
