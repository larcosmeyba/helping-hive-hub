// Kroger product search — by term, optionally scoped to a store (locationId).
// Caches products + per-store pricing in kroger_products / kroger_pricing_cache.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { getServiceClient, krogerGet } from "../_shared/kroger.ts";

interface KrogerProduct {
  productId: string;
  upc?: string;
  description: string;
  brand?: string;
  categories?: string[];
  images?: Array<{ perspective: string; sizes: Array<{ size: string; url: string }> }>;
  items?: Array<{
    itemId?: string;
    size?: string;
    price?: { regular?: number; promo?: number };
    inventory?: { stockLevel?: string };
  }>;
}

function pickImage(p: KrogerProduct): string | null {
  const persp = p.images?.find((i) => i.perspective === "front") ?? p.images?.[0];
  if (!persp) return null;
  const order = ["xlarge", "large", "medium", "small", "thumbnail"];
  for (const s of order) {
    const m = persp.sizes.find((x) => x.size === s);
    if (m) return m.url;
  }
  return persp.sizes[0]?.url ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const term: string = body.term ?? "";
    const locationId: string | undefined = body.locationId;
    const limit = Math.min(Number(body.limit ?? 10), 50);
    if (!term || term.trim().length < 2) {
      return new Response(JSON.stringify({ error: "term required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const params: Record<string, string | number> = {
      "filter.term": term,
      "filter.limit": limit,
    };
    if (locationId) params["filter.locationId"] = locationId;

    const data = await krogerGet<{ data: KrogerProduct[] }>("/products", params);
    const items = data.data ?? [];

    const supabase = getServiceClient();
    if (items.length) {
      const productRows = items.map((p) => ({
        product_id: p.productId,
        upc: p.upc ?? null,
        name: p.description,
        brand: p.brand ?? null,
        size: p.items?.[0]?.size ?? null,
        category: p.categories?.[0] ?? null,
        image_url: pickImage(p),
        raw: p as unknown as Record<string, unknown>,
        last_seen_at: new Date().toISOString(),
      }));
      await supabase.from("kroger_products").upsert(productRows, { onConflict: "product_id" });

      if (locationId) {
        const priceRows = items
          .filter((p) => p.items?.[0]?.price)
          .map((p) => ({
            product_id: p.productId,
            location_id: locationId,
            regular_price: p.items?.[0]?.price?.regular ?? null,
            promo_price: p.items?.[0]?.price?.promo ?? null,
            size: p.items?.[0]?.size ?? null,
            stock_level: p.items?.[0]?.inventory?.stockLevel ?? null,
            fetched_at: new Date().toISOString(),
          }));
        if (priceRows.length) {
          await supabase
            .from("kroger_pricing_cache")
            .upsert(priceRows, { onConflict: "product_id,location_id" });
        }
      }
    }

    return new Response(JSON.stringify({ products: items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
