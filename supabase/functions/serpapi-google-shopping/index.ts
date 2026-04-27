// SerpApi Google Shopping — multi-retailer pricing aggregation.
// Why not direct retailer APIs? Google Shopping aggregates Walmart, Target, Amazon Fresh,
// Kroger family, etc. For our Kroger Public-tier (no live pricing), this is the real source.
//
// Cost guards:
//  - 24h cache per (item, zip)
//  - Hard daily cap (DAILY_CALL_CAP) to prevent runaway spend
//  - Concurrency-limited fan-out
//  - Returns top 3 lowest-priced results per item
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DAILY_CALL_CAP = 500; // hard ceiling — adjust if you upgrade SerpApi plan
const TOP_N = 3;

interface ShoppingResult {
  price: number;
  store: string;
  title: string;
  image: string | null;
  link: string | null;
  source: "serpapi_google_shopping";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SERPAPI_KEY_RAW = Deno.env.get("SERPAPI_KEY");
    if (!SERPAPI_KEY_RAW) return json({ error: "SERPAPI_KEY not configured" }, 500);
    const SERPAPI_KEY: string = SERPAPI_KEY_RAW;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = await req.json().catch(() => ({}));
    const items: string[] = Array.isArray(body.items) ? body.items : [];
    const zipCode: string = (body.zipCode || "").toString().trim();
    if (!items.length || !zipCode) {
      return json({ error: "items[] and zipCode are required" }, 400);
    }

    const uniqueItems = [...new Set(items.map((i) => String(i).toLowerCase().trim()).filter(Boolean))];
    const prices: Record<string, ShoppingResult[]> = {};
    const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString();

    // 1) Cache lookup
    const { data: cached } = await admin
      .from("google_shopping_cache")
      .select("item_name, results, cached_at")
      .in("item_name", uniqueItems)
      .eq("zip_code", zipCode)
      .gte("cached_at", cutoff);

    const cachedSet = new Set<string>();
    for (const row of cached || []) {
      cachedSet.add(row.item_name);
      if (Array.isArray(row.results) && row.results.length) {
        prices[row.item_name] = row.results as ShoppingResult[];
      }
    }

    const toFetch = uniqueItems.filter((i) => !cachedSet.has(i));

    // 2) Daily spend cap check
    const today = new Date().toISOString().slice(0, 10);
    const { data: usage } = await admin
      .from("serpapi_usage")
      .select("call_count")
      .eq("usage_date", today)
      .maybeSingle();
    const usedToday = usage?.call_count ?? 0;
    const remaining = Math.max(0, DAILY_CALL_CAP - usedToday);
    const allowedFetches = toFetch.slice(0, remaining);
    const skipped = toFetch.length - allowedFetches.length;
    if (skipped > 0) {
      console.warn(`serpapi-google-shopping: daily cap hit, skipping ${skipped} items`);
    }

    const upserts: Array<Record<string, unknown>> = [];
    let actualCalls = 0;

    async function fetchOne(item: string): Promise<void> {
      try {
        const url = new URL("https://serpapi.com/search.json");
        url.searchParams.set("engine", "google_shopping");
        url.searchParams.set("q", item);
        url.searchParams.set("location", zipCode);
        url.searchParams.set("gl", "us");
        url.searchParams.set("hl", "en");
        url.searchParams.set("num", "20");
        url.searchParams.set("api_key", SERPAPI_KEY);

        const res = await fetch(url.toString());
        actualCalls++;
        if (!res.ok) {
          console.error(`serpapi google_shopping ${res.status} for "${item}"`);
          return;
        }
        const data = await res.json();
        const raw = Array.isArray(data?.shopping_results) ? data.shopping_results : [];

        const parsed: ShoppingResult[] = raw
          .map((r: Record<string, unknown>) => {
            // Price can be "$3.99" string or extracted_price number
            const extracted = typeof r.extracted_price === "number" ? r.extracted_price : null;
            const fromString =
              typeof r.price === "string" ? Number(r.price.replace(/[^0-9.]/g, "")) : null;
            const price = extracted ?? fromString;
            if (price == null || !isFinite(price) || price <= 0) return null;
            return {
              price: Math.round(price * 100) / 100,
              store: (r.source as string) || "Unknown",
              title: (r.title as string) || item,
              image: (r.thumbnail as string) || null,
              link: (r.link as string) || (r.product_link as string) || null,
              source: "serpapi_google_shopping" as const,
            };
          })
          .filter((x: ShoppingResult | null): x is ShoppingResult => x !== null)
          .sort((a: ShoppingResult, b: ShoppingResult) => a.price - b.price)
          .slice(0, TOP_N);

        prices[item] = parsed;
        upserts.push({
          item_name: item,
          zip_code: zipCode,
          results: parsed,
          cached_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error(`serpapi google_shopping fetch failed for "${item}":`, err);
      }
    }

    const CONCURRENCY = 5;
    for (let i = 0; i < allowedFetches.length; i += CONCURRENCY) {
      await Promise.all(allowedFetches.slice(i, i + CONCURRENCY).map(fetchOne));
    }

    // 3) Persist cache + bump usage counter
    if (upserts.length) {
      await admin
        .from("google_shopping_cache")
        .upsert(upserts, { onConflict: "item_name,zip_code" });
    }
    if (actualCalls > 0) {
      await admin
        .from("serpapi_usage")
        .upsert(
          { usage_date: today, call_count: usedToday + actualCalls, updated_at: new Date().toISOString() },
          { onConflict: "usage_date" },
        );
    }

    return json({ prices, meta: { calls_made: actualCalls, daily_remaining: Math.max(0, remaining - actualCalls), skipped_due_to_cap: skipped } });
  } catch (e) {
    console.error("serpapi-google-shopping error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
