// Centralized client error logger. Writes to activity_logs so admins can
// see runtime errors in the System Health page. Always silent — never
// block UX on a logging failure.
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

interface ErrorContext {
  source?: string;
  componentStack?: string;
  url?: string;
  userAgent?: string;
  extra?: Record<string, unknown>;
}

export async function logClientError(error: unknown, context: ErrorContext = {}) {
  try {
    const message =
      error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";
    const stack = error instanceof Error ? error.stack : undefined;

    const { data: { user } } = await supabase.auth.getUser();

    const details = {
      message: message.slice(0, 1000),
      stack: stack?.slice(0, 4000),
      source: context.source ?? "unknown",
      componentStack: context.componentStack?.slice(0, 4000),
      url: context.url ?? (typeof window !== "undefined" ? window.location.href : undefined),
      userAgent:
        context.userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : undefined),
      ...context.extra,
    } as unknown as Json;

    await supabase.from("activity_logs").insert([{
      user_id: user?.id ?? null,
      action: "client_error",
      entity_type: "error",
      details,
    }]);
  } catch {
    // Silent — logger must never throw.
  }
}

let installed = false;
export function installGlobalErrorHandlers() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (e) => {
    void logClientError(e.error ?? e.message, { source: "window.onerror" });
  });

  window.addEventListener("unhandledrejection", (e) => {
    void logClientError(e.reason, { source: "unhandledrejection" });
  });
}
