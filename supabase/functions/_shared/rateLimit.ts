// Shared per-user rate limiter for AI edge functions.
// Calls the `public.increment_rate_limit` SQL function (hourly buckets in
// api_rate_limits) and returns a 429 Response with a Retry-After header
// when the caller has exceeded the limit.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface RateLimitOptions {
  admin: SupabaseClient;
  userId: string;
  endpoint: string;
  maxPerHour: number;
  corsHeaders?: Record<string, string>;
  /**
   * Set false to bypass this specific limiter. Defaults to true.
   * Intended for temporary testing flags where the caller decides scope.
   */
  enabled?: boolean;
  disabledReason?: string;
  /**
   * When true, an infra error talking to `increment_rate_limit` is treated as
   * "limit exceeded" and we return a 429. Use this on expensive endpoints
   * (full meal-plan generation) where letting traffic through during DB
   * pressure would make a bad situation worse. Defaults to false (fail-open).
   */
  failClosed?: boolean;
}

// Fixed back-off window for infra-error fail-closed responses. Hourly bucket
// math doesn't apply here (the limiter itself failed), so we ask clients to
// retry in ~45s instead of "seconds-to-next-hour" or 0.
const INFRA_ERROR_RETRY_AFTER_SECONDS = 45;

export function envFlagEnabled(name: string, defaultValue = true): boolean {
  const raw = Deno.env.get(name);
  if (raw === undefined || raw === null || raw.trim() === "") return defaultValue;

  const value = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on", "enabled"].includes(value)) return true;
  if (["0", "false", "no", "off", "disabled"].includes(value)) return false;

  console.warn(`[rate-limit] invalid boolean env ${name}=${raw}; using default ${defaultValue}`);
  return defaultValue;
}

function buildRateLimitedResponse(
  endpoint: string,
  currentCount: number,
  limit: number,
  corsHeaders: Record<string, string>,
  reason: "exceeded" | "infra_error" = "exceeded",
): Response {
  let retryAfter: number;
  if (reason === "infra_error") {
    retryAfter = INFRA_ERROR_RETRY_AFTER_SECONDS;
  } else {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setUTCHours(now.getUTCHours() + 1, 0, 0, 0);
    retryAfter = Math.max(1, Math.ceil((nextHour.getTime() - now.getTime()) / 1000));
  }

  const message = reason === "infra_error"
    ? "We're protecting the service while it's under heavy load. Please try again shortly."
    : `You've reached the hourly limit for this feature (${limit}/hour). Please try again soon.`;

  return new Response(
    JSON.stringify({
      ok: false,
      error: "rate_limited",
      message,
      endpoint,
      current_count: currentCount,
      limit_per_hour: limit,
      retry_after_seconds: retryAfter,
      reason,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    },
  );
}

/**
 * Returns a 429 Response if the user is over the limit, otherwise null.
 *
 * Fail-open by default: infra errors talking to the limiter return null so
 * cheap endpoints (chat, swap, analysis) keep working through transient DB
 * hiccups.
 *
 * Pass `failClosed: true` on expensive endpoints (full meal-plan generation,
 * `process-hive-ai:meal_plan_generation`) so they shed traffic instead of
 * flooding the DB exactly when it's already struggling.
 */
export async function enforceRateLimit(
  opts: RateLimitOptions,
): Promise<Response | null> {
  const {
    admin,
    userId,
    endpoint,
    maxPerHour,
    corsHeaders = {},
    failClosed = false,
    enabled = true,
    disabledReason,
  } = opts;
  if (!enabled) {
    console.warn(`[rate-limit] bypassed for ${endpoint}${disabledReason ? ` (${disabledReason})` : ""}`);
    return null;
  }

  try {
    const { data, error } = await admin.rpc("increment_rate_limit", {
      _user_id: userId,
      _endpoint: endpoint,
      _max_per_hour: maxPerHour,
    });
    if (error) {
      console.warn(`[rate-limit] rpc error for ${endpoint} (failClosed=${failClosed}):`, error.message);
      if (failClosed) {
        return buildRateLimitedResponse(endpoint, 0, maxPerHour, corsHeaders, "infra_error");
      }
      return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    const allowed = row?.allowed ?? true;
    const currentCount = row?.current_count ?? 0;
    const limit = row?.limit_per_hour ?? maxPerHour;
    if (allowed) return null;

    return buildRateLimitedResponse(endpoint, currentCount, limit, corsHeaders, "exceeded");
  } catch (err) {
    console.warn(`[rate-limit] unexpected error for ${endpoint} (failClosed=${failClosed}):`, err);
    if (failClosed) {
      return buildRateLimitedResponse(endpoint, 0, maxPerHour, corsHeaders, "infra_error");
    }
    return null;
  }
}
