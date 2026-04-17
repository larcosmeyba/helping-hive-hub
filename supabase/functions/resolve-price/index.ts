// Three-layer price resolver: Kroger live → regional baseline → national baseline.
// Returns the best available price for a given ingredient + user state/zip.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResolveRequest {
  ingredient_id?: string;
  ingredient_name?: string;
  state?: string;
  retailer_price?: number | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = (await req.json()) as ResolveRequest;
    const { ingredient_id, ingredient_name, state, retailer_price } = body;

    // Layer 1: retailer (Kroger) — caller provides if available
    if (retailer_price != null && retailer_price > 0) {
      return json({
        price: Number(retailer_price),
        source: "retailer",
        confidence: "high",
      });
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

    // Layer 2: regional
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

    // Layer 3: national fallback
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
