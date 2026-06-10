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
   * When true, an infra error talking to `increment_rate_limit` is treated as
   * "limit exceeded" and we return a 429. Use this on expensive endpoints
   * (full meal-plan generation) where letting traffic through during DB
   * pressure would make a bad situation worse. Defaults to false (fail-open).
   */
  failClosed?: boolean;
}

function buildRateLimitedResponse(
  endpoint: string,
  currentCount: number,
  limit: number,
  corsHeaders: Record<string, string>,
  reason: "exceeded" | "infra_error" = "exceeded",
): Response {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setUTCHours(now.getUTCHours() + 1, 0, 0, 0);
  const retryAfter = Math.max(1, Math.ceil((nextHour.getTime() - now.getTime()) / 1000));

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
  const { admin, userId, endpoint, maxPerHour, corsHeaders = {}, failClosed = false } = opts;
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
