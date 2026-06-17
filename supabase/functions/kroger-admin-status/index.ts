// Admin status snapshot for the Kroger integration.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getAppToken, getKrogerEnv, getServiceClient } from "../_shared/kroger.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    const uid = claims?.claims?.sub;
    if (!uid) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = getServiceClient();
    const { data: isAdminData } = await supabase.rpc("is_admin", { _user_id: uid });
    if (!isAdminData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const env = getKrogerEnv();
    let apiStatus = "ok";
    let apiError: string | null = null;
    try {
      await getAppToken();
    } catch (e) {
      apiStatus = "error";
      apiError = (e as Error).message;
    }

    const { data: tok } = await supabase
      .from("kroger_access_tokens")
      .select("expires_at, scope, updated_at")
      .eq("environment", env)
      .maybeSingle();

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
    const [
      { count: connectedUsers },
      { count: matched7d },
      { count: failed7d },
      { count: cacheHits7d },
      { data: lastLoc },
      { data: lastPrice },
      { data: lastMatch },
    ] = await Promise.all([
      supabase.from("kroger_user_tokens").select("*", { count: "exact", head: true }).eq("environment", env),
      supabase.from("kroger_product_matches").select("*", { count: "exact", head: true }).eq("status", "matched").gte("matched_at", sevenDaysAgo),
      supabase.from("kroger_product_matches").select("*", { count: "exact", head: true }).eq("status", "no_match").gte("matched_at", sevenDaysAgo),
      supabase.from("kroger_product_matches").select("*", { count: "exact", head: true }).eq("status", "matched").eq("from_cache", true).gte("matched_at", sevenDaysAgo),
      supabase.from("kroger_locations").select("cached_at").order("cached_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("kroger_pricing_cache").select("fetched_at").order("fetched_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("kroger_product_matches").select("matched_at").eq("status", "matched").order("matched_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    const matchedN = matched7d ?? 0;
    const failedN = failed7d ?? 0;
    const totalAttempts = matchedN + failedN;
    const matchRate = totalAttempts > 0 ? Math.round((matchedN / totalAttempts) * 1000) / 10 : 0;

    return new Response(JSON.stringify({
      environment: env,
      apiStatus,
      apiError,
      appToken: tok,
      connectedUsers: connectedUsers ?? 0,
      matched7d: matchedN,
      failed7d: failedN,
      cacheHits7d: cacheHits7d ?? 0,
      matchRate,
      lastSuccessfulMatch: lastMatch?.matched_at ?? null,
      lastLocationSync: lastLoc?.cached_at ?? null,
      lastPriceSync: lastPrice?.fetched_at ?? null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
