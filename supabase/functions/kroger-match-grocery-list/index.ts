// Match every item in a user's grocery list to a Kroger product and price.
// Persists matches + per-store pricing, returns an itemized total.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getServiceClient, krogerGet } from "../_shared/kroger.ts";

interface KrogerProduct {
  productId: string;
  upc?: string;
  description: string;
  brand?: string;
  images?: Array<{ perspective: string; sizes: Array<{ size: string; url: string }> }>;
  items?: Array<{
    size?: string;
    price?: { regular?: number; promo?: number };
    inventory?: { stockLevel?: string };
  }>;
}

function pickImage(p: KrogerProduct): string | null {
  const persp = p.images?.find((i) => i.perspective === "front") ?? p.images?.[0];
  if (!persp) return null;
  return persp.sizes.find((x) => x.size === "medium")?.url ?? persp.sizes[0]?.url ?? null;
}

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
    const items: Array<{ id?: string; name: string; quantity?: number }> = body.items ?? [];
    const locationId: string | undefined = body.locationId;
    if (!items.length || !locationId) {
      return new Response(
        JSON.stringify({ error: "items[] and locationId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = getServiceClient();
    const matches: Array<Record<string, unknown>> = [];
    let total = 0;
    let matched = 0;
    let failed = 0;

    for (const item of items) {
      try {
        const data = await krogerGet<{ data: KrogerProduct[] }>("/products", {
          "filter.term": item.name,
          "filter.locationId": locationId,
          "filter.limit": 5,
        });
        const best = (data.data ?? [])[0];
        if (!best) {
          failed += 1;
          matches.push({
            user_id: userId,
            grocery_list_item_id: item.id ?? null,
            ingredient_name: item.name,
            location_id: locationId,
            status: "no_match",
          });
          continue;
        }
        const priceObj = best.items?.[0]?.price;
        const price = priceObj?.promo ?? priceObj?.regular ?? 0;
        const stock = best.items?.[0]?.inventory?.stockLevel ?? null;
        const qty = item.quantity ?? 1;
        total += price * qty;
        matched += 1;
        matches.push({
          user_id: userId,
          grocery_list_item_id: item.id ?? null,
          ingredient_name: item.name,
          location_id: locationId,
          product_id: best.productId,
          upc: best.upc ?? null,
          matched_name: best.description,
          brand: best.brand ?? null,
          size: best.items?.[0]?.size ?? null,
          image_url: pickImage(best),
          unit_price: price,
          confidence: 0.8,
          status: "matched",
          availability: stock,
        });
      } catch (_e) {
        failed += 1;
      }
    }

    if (matches.length) {
      // availability is response-only — strip before insert (not a column)
      const rows = matches.map(({ availability: _a, ...rest }: any) => rest);
      await supabase.from("kroger_product_matches").insert(rows);
    }

    return new Response(
      JSON.stringify({
        matches,
        totals: { matched, failed, estimatedTotal: Math.round(total * 100) / 100 },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
