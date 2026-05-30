// Instacart Developer Platform — Create Shopping List or Recipe page link.
// Docs:
//   - Shopping list: https://docs.instacart.com/developer_platform_api/api/products_link
//   - Recipe page:   https://docs.instacart.com/developer_platform_api/api/recipe
// Auth: single API key via `Authorization: Bearer <INSTACART_API_KEY>`
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEV_BASE = "https://connect.dev.instacart.tools";
const PROD_BASE = "https://connect.instacart.com";

interface ShoppingLineItem {
  name: string;
  quantity?: number;
  unit?: string;
  display_text?: string;
  upcs?: string[];
  line_item_measurements?: Array<{ quantity: number; unit: string }>;
  filters?: { brand_filters?: string[]; health_filters?: string[] };
}

interface RecipeIngredient {
  name: string;
  display_text?: string;
  upcs?: string[];
  measurements?: Array<{ quantity: number; unit: string }>;
  filters?: { brand_filters?: string[]; health_filters?: string[] };
}

interface CreateListBody {
  title: string;
  image_url?: string;
  link_type?: "shopping_list" | "recipe";
  expires_in?: number; // days; defaults to 30
  instructions?: string[];
  // For shopping_list endpoint:
  line_items?: ShoppingLineItem[];
  // For recipe endpoint (preferred when link_type === "recipe"):
  ingredients?: RecipeIngredient[];
  landing_page_configuration?: {
    partner_linkback_url?: string;
    enable_pantry_items?: boolean;
  };
  // If omitted, defaults to "production" so live users hit the prod IDP.
  environment?: "development" | "production";
}

Deno.serve(async (req) => {
  const pf = handlePreflight(req);
  if (pf) return pf;
  const corsHeaders = buildCorsHeaders(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const apiKey = Deno.env.get("INSTACART_API_KEY");
    if (!apiKey) return json({ error: "INSTACART_API_KEY not configured" }, 500);

    const body = (await req.json()) as CreateListBody;
    if (!body?.title || typeof body.title !== "string" || body.title.length > 200) {
      return json({ error: "title is required (max 200 chars)" }, 400);
    }

    const linkType = body.link_type ?? "shopping_list";
    const isRecipe = linkType === "recipe";

    // Validate the right items array depending on link type.
    const items = isRecipe ? body.ingredients : body.line_items;
    if (!Array.isArray(items) || items.length === 0) {
      return json(
        {
          error: isRecipe
            ? "ingredients must be a non-empty array for recipe links"
            : "line_items must be a non-empty array",
        },
        400,
      );
    }
    if (items.length > 100) {
      return json({ error: "items may not exceed 100 entries" }, 400);
    }

    const env = body.environment === "development" ? "development" : "production";
    const base = env === "production" ? PROD_BASE : DEV_BASE;
    const path = isRecipe
      ? "/idp/v1/products/recipe"
      : "/idp/v1/products/products_link";
    const url = `${base}${path}`;

    // Best-effort UPC enrichment for greater Instacart match accuracy.
    // Looks up canonical_products by name (and aliases) and attaches `upcs`
    // when a GTIN/UPC is on file. Silent no-op if the DB has no UPCs yet
    // or if the lookup fails — never blocks the IDP call.
    const enrichedItems = await enrichWithUpcs(items as Array<ShoppingLineItem | RecipeIngredient>);
    const upcMatched = enrichedItems.filter((i) => i.upcs && i.upcs.length > 0).length;
    if (upcMatched > 0) {
      console.log(`[instacart-create-list] Attached UPCs to ${upcMatched}/${enrichedItems.length} items`);
    }

    const payload: Record<string, unknown> = {
      title: body.title,
      link_type: linkType,
      expires_in: body.expires_in ?? 30,
    };
    if (isRecipe) {
      payload.ingredients = enrichedItems;
    } else {
      payload.line_items = enrichedItems;
    }
    if (body.image_url) payload.image_url = body.image_url;
    if (body.instructions) payload.instructions = body.instructions;
    if (body.landing_page_configuration) {
      payload.landing_page_configuration = body.landing_page_configuration;
    }

    // Single retry on 429 honoring Retry-After (capped at 5s) for resilience.
    const callIdp = () =>
      fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

    let res = await callIdp();
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("Retry-After") ?? "1");
      const waitMs = Math.min(Math.max(retryAfter, 1), 5) * 1000;
      await new Promise((r) => setTimeout(r, waitMs));
      res = await callIdp();
    }

    const text = await res.text();
    if (!res.ok) {
      console.error("Instacart IDP error:", res.status, text);
      return json({ error: "Instacart API error", status: res.status }, res.status);
    }

    const data = JSON.parse(text);
    return json({ ...data, environment: env, endpoint: path });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("instacart-create-list error:", msg);
    return json({ error: msg }, 500);
  }
});

// --- UPC enrichment ---------------------------------------------------------

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function enrichWithUpcs<T extends { name: string; upcs?: string[] }>(
  items: T[],
): Promise<T[]> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return items;

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Build unique normalized name set
    const normalized = items.map((i) => normalizeName(i.name)).filter(Boolean);
    const uniq = Array.from(new Set(normalized));
    if (uniq.length === 0) return items;

    // 1. Direct canonical name match (case-insensitive)
    const { data: canonicals } = await supabase
      .from("canonical_products")
      .select("canonical_product_id, canonical_name, gtin_upc")
      .not("gtin_upc", "is", null);

    // 2. Alias match (case-insensitive)
    const { data: aliases } = await supabase
      .from("canonical_product_aliases")
      .select("alias_text, canonical_product_id");

    const upcByProductId = new Map<string, string>();
    for (const c of canonicals ?? []) {
      if (c.gtin_upc) upcByProductId.set(c.canonical_product_id as string, c.gtin_upc as string);
    }

    const upcByNormName = new Map<string, string>();
    for (const c of canonicals ?? []) {
      if (c.gtin_upc) {
        upcByNormName.set(normalizeName(c.canonical_name as string), c.gtin_upc as string);
      }
    }
    for (const a of aliases ?? []) {
      const upc = upcByProductId.get(a.canonical_product_id as string);
      if (upc) upcByNormName.set(normalizeName(a.alias_text as string), upc);
    }

    return items.map((item) => {
      if (item.upcs && item.upcs.length > 0) return item; // caller-supplied UPCs win
      const norm = normalizeName(item.name);
      const upc =
        upcByNormName.get(norm) ??
        // loose contains-match fallback (item name contains a known canonical key)
        Array.from(upcByNormName.entries()).find(([k]) => k && norm.includes(k))?.[1];
      return upc ? { ...item, upcs: [upc] } : item;
    });
  } catch (err) {
    console.warn("[instacart-create-list] UPC enrichment skipped:", err);
    return items;
  }
}
