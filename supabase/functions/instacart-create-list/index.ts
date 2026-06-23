// Instacart Developer Platform — Create Shopping List or Recipe page link.
// Docs:
//   - Shopping list: https://docs.instacart.com/developer_platform_api/api/products_link
//   - Recipe page:   https://docs.instacart.com/developer_platform_api/api/recipe
// Auth: single API key via `Authorization: Bearer <INSTACART_API_KEY>`.
// Caller auth: standard Supabase JWT (verify_jwt=true by default in this
// project for any function not listed in supabase/config.toml). We also
// validate the user explicitly below so anonymous callers are rejected
// even if the platform JWT verification is ever bypassed.
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";
import { captureEdgeError } from "../_shared/sentry.ts";
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
  line_items?: ShoppingLineItem[];
  ingredients?: RecipeIngredient[];
  landing_page_configuration?: {
    partner_linkback_url?: string;
    enable_pantry_items?: boolean;
  };
  // Defaults to "production".
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

  let userId: string | null = null;

  try {
    // --- Auth gate: require a real signed-in user. -----------------------
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!supabaseUrl || !anonKey) {
      return json({ error: "Server misconfigured" }, 500);
    }
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const authedClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await authedClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }
    userId = userData.user.id;

    const body = (await req.json()) as CreateListBody;
    const env = body?.environment === "development" ? "development" : "production";
    const apiKey =
      env === "development"
        ? Deno.env.get("Instacart_API_KEY_DEVELOPMENT") ??
          Deno.env.get("INSTACART_API_KEY_DEVELOPMENT") ??
          Deno.env.get("INSTACART_API_KEY")
        : Deno.env.get("INSTACART_API_KEY");
    if (!apiKey) {
      return json(
        { error: `Instacart API key not configured for ${env} environment` },
        500,
      );
    }

    if (!body?.title || typeof body.title !== "string" || body.title.length > 200) {
      return json({ error: "title is required (max 200 chars)" }, 400);
    }

    const linkType = body.link_type ?? "shopping_list";
    const isRecipe = linkType === "recipe";

    const rawItems = isRecipe ? body.ingredients : body.line_items;
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return json(
        {
          error: isRecipe
            ? "ingredients must be a non-empty array for recipe links"
            : "line_items must be a non-empty array",
        },
        400,
      );
    }

    const MAX_ITEMS = 100;
    const truncatedCount = Math.max(0, rawItems.length - MAX_ITEMS);
    const items = rawItems.slice(0, MAX_ITEMS);

    const base = env === "production" ? PROD_BASE : DEV_BASE;
    const path = isRecipe
      ? "/idp/v1/products/recipe"
      : "/idp/v1/products/products_link";
    const url = `${base}${path}`;

    // Best-effort UPC enrichment for greater Instacart match accuracy.
    const enrichedItems = await enrichWithUpcs(
      items as Array<ShoppingLineItem | RecipeIngredient>,
    );

    const payload: Record<string, unknown> = {
      title: body.title,
      link_type: linkType,
      expires_in: body.expires_in ?? 30,
    };
    if (isRecipe) payload.ingredients = enrichedItems;
    else payload.line_items = enrichedItems;
    if (body.image_url) payload.image_url = body.image_url;
    if (body.instructions) payload.instructions = body.instructions;
    if (body.landing_page_configuration) {
      payload.landing_page_configuration = body.landing_page_configuration;
    }

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
      await captureEdgeError(new Error(`Instacart IDP ${res.status}`), {
        fn: "instacart-create-list",
        user_id: userId,
        status: res.status,
        extra: { responseSnippet: text.slice(0, 500), env, path },
      });
      return json({ error: "Instacart API error", status: res.status }, res.status);
    }

    const data = JSON.parse(text);
    return json({ ...data, environment: env, endpoint: path, truncated: truncatedCount });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("instacart-create-list error:", msg);
    await captureEdgeError(err, { fn: "instacart-create-list", user_id: userId });
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

    const normalized = items.map((i) => normalizeName(i.name)).filter(Boolean);
    if (normalized.length === 0) return items;

    const canonicalsRes = await supabase
      .from("canonical_products")
      .select("canonical_product_id, canonical_name, gtin_upc")
      .not("gtin_upc", "is", null);
    const canonicals = canonicalsRes.data;

    const aliasesRes = await supabase
      .from("canonical_product_aliases")
      .select("alias_text, canonical_product_id");
    const aliases = aliasesRes.data;

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
      if (item.upcs && item.upcs.length > 0) return item;
      const norm = normalizeName(item.name);
      const upc =
        upcByNormName.get(norm) ??
        Array.from(upcByNormName.entries()).find(([k]) => k && norm.includes(k))?.[1];
      return upc ? { ...item, upcs: [upc] } : item;
    });
  } catch (err) {
    console.warn("[instacart-create-list] UPC enrichment skipped — table may not exist:", err);
    return items;
  }
}
