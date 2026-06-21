// Thin wrapper around the shared krogerPricing matcher. Same relevance gate,
// same cheapest-first selection, same package-quantity logic the meal-plan
// budget gate uses — one number across the app.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getServiceClient } from "../_shared/kroger.ts";
import { priceBasketWithKroger, RELEVANCE_THRESHOLD } from "../_shared/krogerPricing.ts";
import { captureEdgeError } from "../_shared/sentry.ts";

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
    if (!claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const items: Array<{ id?: string; name: string; quantity?: number | string }> = body.items ?? [];
    const locationId: string | undefined = body.locationId;
    const skipCache: boolean = body.skipCache === true || body.simplify === true;
    if (!items.length || !locationId) {
      return new Response(
        JSON.stringify({ error: "items[] and locationId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = getServiceClient();
    const basket = await priceBasketWithKroger(
      supabase, userId, locationId,
      items.map((i) => ({ id: i.id ?? null, name: i.name, quantity: i.quantity ?? 1 })),
      { skipCache },
    );

    // Shape into the legacy {matches, totals} response the UI consumes.
    const matches = basket.lines.map((l) => ({
      ingredient_name: l.name,
      status: l.status ?? (l.matched ? "matched" : "no_match"),
      matched_name: l.matched_name ?? undefined,
      brand: l.brand ?? null,
      size: l.size ?? null,
      image_url: l.image_url ?? null,
      unit_price: l.package_price,
      line_total: l.line_total,
      packages: l.quantity,
      confidence: l.match_confidence,
      availability: l.availability ?? null,
      from_cache: false,
    }));

    return new Response(
      JSON.stringify({
        matches,
        totals: {
          matched: basket.matched_count,
          failed: basket.unmatched_count,
          needs_review: basket.needs_review_count,
          cacheHits: 0,
          estimatedTotal: basket.subtotal,
          relevance_threshold: RELEVANCE_THRESHOLD,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    try { captureEdgeError(e, { fn: "kroger-match-grocery-list" }); } catch { /* noop */ }
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
