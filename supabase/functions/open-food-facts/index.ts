// Open Food Facts product lookup. Free public API, no key required.
// Caches results in Supabase for 7 days since product data rarely changes.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface OFFProduct {
  image: string | null;
  brand: string | null;
  productName: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = await req.json().catch(() => ({}));
    const items: string[] = Array.isArray(body.items) ? body.items : [];

    if (!items.length) return json({ products: {} });

    const uniqueItems = [...new Set(items.map((i) => i.toLowerCase().trim()).filter(Boolean))];
    const products: Record<string, OFFProduct> = {};
    const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString();

    // 1) Cache lookup
    const { data: cached } = await admin
      .from("open_food_facts_cache")
      .select("item_name, product_name, image, brand, calories, protein, carbs, fat, cached_at")
      .in("item_name", uniqueItems)
      .gte("cached_at", cutoff);

    const cachedSet = new Set<string>();
    for (const row of cached || []) {
      cachedSet.add(row.item_name);
      products[row.item_name] = {
        productName: row.product_name,
        image: row.image,
        brand: row.brand,
        calories: row.calories !== null ? Number(row.calories) : null,
        protein: row.protein !== null ? Number(row.protein) : null,
        carbs: row.carbs !== null ? Number(row.carbs) : null,
        fat: row.fat !== null ? Number(row.fat) : null,
      };
    }

    const toFetch = uniqueItems.filter((i) => !cachedSet.has(i));
    const upserts: Array<Record<string, unknown>> = [];

    // Strip noise that wrecks search relevance — quantities, parenthetical
    // notes, "leftover", "to taste", "for cooking", etc.
    function cleanQuery(raw: string): string {
      return raw
        .toLowerCase()
        .replace(/\bleftover\b/g, "")
        .replace(/\([^)]*\)/g, "")
        .replace(/,.*$/g, "")
        .replace(/\bfor (cooking|garnish|serving|taste).*$/g, "")
        .replace(/\bto taste\b/g, "")
        .replace(/\boptional\b/g, "")
        .replace(/\b(chopped|diced|minced|sliced|shredded|grated|crushed|ground|fresh|frozen|raw|cooked|large|small|medium)\b/g, "")
        .replace(/\bor\b.*$/g, "")
        .replace(/[^a-z\s-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    async function fetchOne(item: string): Promise<void> {
      const query = cleanQuery(item) || item;
      try {
        // Search-a-licious (v2) — reliable, modern endpoint. Replaces the
        // legacy cgi/search.pl which has been returning 503 under load.
        const url = new URL("https://search.openfoodfacts.org/search");
        url.searchParams.set("q", query);
        url.searchParams.set("page_size", "1");
        url.searchParams.set("fields", "product_name,image_url,brands,nutriments");
        url.searchParams.set("langs", "en");

        const res = await fetch(url.toString(), {
          headers: { "User-Agent": "HelpTheHive/1.0 (https://helpthehive.com)" },
        });
        if (!res.ok) {
          console.error(`OFF ${res.status} for "${query}"`);
          return;
        }
        const data = await res.json();
        const first = data?.hits?.[0];
        if (!first) return;

        const n = first.nutriments || {};
        const brandsRaw = first.brands;
        const brand = Array.isArray(brandsRaw)
          ? (brandsRaw[0] ?? null)
          : (brandsRaw ? String(brandsRaw).split(",")[0].trim() : null);
        const product: OFFProduct = {
          productName: first.product_name || null,
          image: first.image_url || null,
          brand,
          calories: typeof n["energy-kcal_100g"] === "number" ? n["energy-kcal_100g"] : null,
          protein: typeof n["proteins_100g"] === "number" ? n["proteins_100g"] : null,
          carbs: typeof n["carbohydrates_100g"] === "number" ? n["carbohydrates_100g"] : null,
          fat: typeof n["fat_100g"] === "number" ? n["fat_100g"] : null,
        };

        products[item] = product;
        upserts.push({
          item_name: item,
          product_name: product.productName,
          image: product.image,
          brand: product.brand,
          calories: product.calories,
          protein: product.protein,
          carbs: product.carbs,
          fat: product.fat,
          cached_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error(`OFF fetch failed for "${item}":`, err);
      }
    }

    // Concurrency-limited parallel fetches
    const CONCURRENCY = 5;
    for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
      await Promise.all(toFetch.slice(i, i + CONCURRENCY).map(fetchOne));
    }

    if (upserts.length) {
      await admin.from("open_food_facts_cache").upsert(upserts, { onConflict: "item_name" });
    }

    return json({ products });
  } catch (e) {
    console.error("open-food-facts error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
