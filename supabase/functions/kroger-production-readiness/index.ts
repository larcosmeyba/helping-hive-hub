// Aggregated stats + sample report for the Kroger Production Readiness page.
// Admin-only. Read-only — no external Kroger calls.

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

    // API uptime / app token health.
    let apiStatus: "ok" | "error" = "ok";
    let apiError: string | null = null;
    try { await getAppToken(); } catch (e) { apiStatus = "error"; apiError = (e as Error).message; }

    const [
      { count: connectedUsers },
      { count: groceryListsCount },
      { count: totalMatches },
      { count: matchedCount },
      { count: unmatchedCount },
      { count: cacheHits },
      { data: lastSync },
    ] = await Promise.all([
      supabase.from("kroger_user_tokens").select("*", { count: "exact", head: true }).eq("environment", env),
      supabase.from("grocery_lists").select("*", { count: "exact", head: true }),
      supabase.from("kroger_product_matches").select("*", { count: "exact", head: true }),
      supabase.from("kroger_product_matches").select("*", { count: "exact", head: true }).eq("status", "matched"),
      supabase.from("kroger_product_matches").select("*", { count: "exact", head: true }).eq("status", "no_match"),
      supabase.from("kroger_product_matches").select("*", { count: "exact", head: true }).eq("status", "matched").eq("from_cache", true),
      supabase.from("kroger_product_matches").select("matched_at").eq("status", "matched").order("matched_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    const matchedN = matchedCount ?? 0;
    const unmatchedN = unmatchedCount ?? 0;
    const totalAttempts = matchedN + unmatchedN;
    const matchRate = totalAttempts > 0 ? Math.round((matchedN / totalAttempts) * 1000) / 10 : 0;
    const cacheHitRate = matchedN > 0 ? Math.round(((cacheHits ?? 0) / matchedN) * 1000) / 10 : 0;

    // Average grocery list total = AVG over distinct grocery lists of (sum of matched unit_price)
    const { data: listTotals } = await supabase
      .from("kroger_product_matches")
      .select("grocery_list_item_id, unit_price, status")
      .eq("status", "matched")
      .not("grocery_list_item_id", "is", null)
      .limit(5000);
    const sumByList = new Map<string, number>();
    for (const r of listTotals ?? []) {
      const k = (r as any).grocery_list_item_id as string;
      sumByList.set(k, (sumByList.get(k) ?? 0) + Number((r as any).unit_price ?? 0));
    }
    const totals = Array.from(sumByList.values());
    const avgGroceryListTotal = totals.length
      ? Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 100) / 100
      : 0;

    // Average budget savings — compare weekly_budget on profiles to avg total when both exist.
    const { data: budgets } = await supabase
      .from("profiles")
      .select("weekly_budget")
      .not("weekly_budget", "is", null)
      .limit(2000);
    const budgetVals = (budgets ?? [])
      .map((p: any) => Number(p.weekly_budget))
      .filter((n) => Number.isFinite(n) && n > 0);
    const avgBudget = budgetVals.length
      ? budgetVals.reduce((a, b) => a + b, 0) / budgetVals.length
      : 0;
    const avgBudgetSavings = avgBudget > 0 && avgGroceryListTotal > 0
      ? Math.round((avgBudget - avgGroceryListTotal) * 100) / 100
      : 0;

    // Sample report: most recent grocery list with Kroger matches.
    const { data: recentMatch } = await supabase
      .from("kroger_product_matches")
      .select("user_id, location_id, matched_at")
      .eq("status", "matched")
      .order("matched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let sampleReport: {
      generatedAt: string | null;
      locationId: string | null;
      matched: any[];
      needsReview: any[];
      estimatedTotal: number;
      weeklyBudget: number | null;
      remaining: number | null;
    } = {
      generatedAt: null, locationId: null, matched: [], needsReview: [],
      estimatedTotal: 0, weeklyBudget: null, remaining: null,
    };

    if (recentMatch?.user_id && recentMatch?.location_id) {
      const since = new Date(new Date(recentMatch.matched_at).getTime() - 60_000).toISOString();
      const { data: rows } = await supabase
        .from("kroger_product_matches")
        .select("ingredient_name, status, matched_name, brand, size, unit_price")
        .eq("user_id", recentMatch.user_id)
        .eq("location_id", recentMatch.location_id)
        .gte("matched_at", since)
        .limit(200);
      const matched = (rows ?? []).filter((r: any) => r.status === "matched");
      const needsReview = (rows ?? []).filter((r: any) => r.status === "no_match");
      const estimatedTotal = Math.round(
        matched.reduce((s: number, r: any) => s + Number(r.unit_price ?? 0), 0) * 100,
      ) / 100;
      const { data: prof } = await supabase
        .from("profiles")
        .select("weekly_budget")
        .eq("user_id", recentMatch.user_id)
        .maybeSingle();
      const wb = (prof as any)?.weekly_budget
        ? Number((prof as any).weekly_budget) : null;
      sampleReport = {
        generatedAt: recentMatch.matched_at,
        locationId: recentMatch.location_id,
        matched, needsReview, estimatedTotal,
        weeklyBudget: wb,
        remaining: wb !== null ? Math.round((wb - estimatedTotal) * 100) / 100 : null,
      };
    }

    return new Response(JSON.stringify({
      environment: env,
      apiStatus,
      apiError,
      connectedUsers: connectedUsers ?? 0,
      groceryListsGenerated: groceryListsCount ?? 0,
      totalMatches: totalMatches ?? 0,
      matchedCount: matchedN,
      unmatchedCount: unmatchedN,
      matchRate,
      cacheHits: cacheHits ?? 0,
      cacheHitRate,
      avgGroceryListTotal,
      avgBudget: Math.round(avgBudget * 100) / 100,
      avgBudgetSavings,
      lastSuccessfulSync: lastSync?.matched_at ?? null,
      sampleReport,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
