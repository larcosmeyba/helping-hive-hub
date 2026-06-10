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
}

/**
 * Returns a 429 Response if the user is over the limit, otherwise null.
 * Fails open on infra errors (logs warning) so we never block legit traffic
 * because of a transient DB hiccup.
 */
export async function enforceRateLimit(
  opts: RateLimitOptions,
): Promise<Response | null> {
  const { admin, userId, endpoint, maxPerHour, corsHeaders = {} } = opts;
  try {
    const { data, error } = await admin.rpc("increment_rate_limit", {
      _user_id: userId,
      _endpoint: endpoint,
      _max_per_hour: maxPerHour,
    });
    if (error) {
      console.warn(`[rate-limit] rpc error for ${endpoint}:`, error.message);
      return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    const allowed = row?.allowed ?? true;
    const currentCount = row?.current_count ?? 0;
    const limit = row?.limit_per_hour ?? maxPerHour;
    if (allowed) return null;

    // Seconds until top of next hour.
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setUTCHours(now.getUTCHours() + 1, 0, 0, 0);
    const retryAfter = Math.max(1, Math.ceil((nextHour.getTime() - now.getTime()) / 1000));

    return new Response(
      JSON.stringify({
        ok: false,
        error: "rate_limited",
        message: `You've reached the hourly limit for this feature (${limit}/hour). Please try again soon.`,
        endpoint,
        current_count: currentCount,
        limit_per_hour: limit,
        retry_after_seconds: retryAfter,
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
  } catch (err) {
    console.warn(`[rate-limit] unexpected error for ${endpoint}:`, err);
    return null;
  }
}
