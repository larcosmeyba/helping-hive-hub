// Pricing fallback chain (in order):
//   1. Open Prices (Open Food Facts community-submitted) — caller can pass via open_price
//   2. SerpApi Google Shopping — caller passes lowest result via shopping_price
//   3. SerpApi Walmart direct — caller passes via retailer_price
//   4. Regional baseline (BLS-adjusted via region table)
//   5. National baseline
// Note: Kroger is NOT a pricing source — Public-tier API has no live prices. Used only
// for product metadata (images/UPC/store lookup).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResolveRequest {
  ingredient_id?: string;
  ingredient_name?: string;
  state?: string;
  open_price?: number | null;       // Layer 1
  shopping_price?: number | null;   // Layer 2 (Google Shopping lowest)
  retailer_price?: number | null;   // Layer 3 (Walmart direct)
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = (await req.json()) as ResolveRequest;
    const { ingredient_id, ingredient_name, state, open_price, shopping_price, retailer_price } = body;

    // Layer 1: Open Prices (community)
    if (open_price != null && open_price > 0) {
      return json({ price: Number(open_price), source: "open_prices", confidence: "medium" });
    }

    // Layer 2: Google Shopping aggregated
    if (shopping_price != null && shopping_price > 0) {
      return json({ price: Number(shopping_price), source: "google_shopping", confidence: "high" });
    }

    // Layer 3: Walmart direct
    if (retailer_price != null && retailer_price > 0) {
      return json({ price: Number(retailer_price), source: "walmart", confidence: "high" });
    }

    // Resolve ingredient_id from name if needed
    let resolvedId = ingredient_id;
    if (!resolvedId && ingredient_name) {
      const { data } = await admin
        .from("ingredients")
        .select("ingredient_id")
        .ilike("ingredient_name", ingredient_name)
        .limit(1)
        .maybeSingle();
      resolvedId = data?.ingredient_id;
    }

    if (!resolvedId) {
      return json({ price: null, source: "none", confidence: "low", reason: "ingredient_not_found" });
    }

    // Layer 4: regional (BLS-adjusted baselines live in regional_food_prices)
    if (state) {
      const { data: regional } = await admin
        .from("regional_food_prices")
        .select("average_price, unit, last_updated")
        .eq("ingredient_id", resolvedId)
        .eq("region", state)
        .order("last_updated", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (regional?.average_price) {
        return json({
          price: Number(regional.average_price),
          unit: regional.unit,
          source: "regional",
          confidence: "medium",
        });
      }
    }

    // Layer 5: national fallback (consumer of resolve-price applies BLS multiplier on top)
    const { data: national } = await admin
      .from("national_food_prices")
      .select("national_avg_price, unit, last_updated")
      .eq("ingredient_id", resolvedId)
      .order("last_updated", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (national?.national_avg_price) {
      return json({
        price: Number(national.national_avg_price),
        unit: national.unit,
        source: "national",
        confidence: "low",
      });
    }

    return json({ price: null, source: "none", confidence: "low", reason: "no_price_data" });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
