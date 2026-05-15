// Instacart Developer Platform — Create "Shopping List" link
// Docs: https://docs.instacart.com/developer_platform_api/api/products_link
// Auth: single API key via `Authorization: Bearer <INSTACART_API_KEY>`
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";

const DEV_BASE = "https://connect.dev.instacart.tools";
const PROD_BASE = "https://connect.instacart.com";

interface LineItem {
  name: string;
  quantity?: number;
  unit?: string;
  display_text?: string;
  line_item_measurements?: Array<{ quantity: number; unit: string }>;
  filters?: { brand_filters?: string[]; health_filters?: string[] };
}

interface CreateListBody {
  title: string;
  image_url?: string;
  link_type?: "shopping_list" | "recipe";
  expires_in?: number; // days; defaults to 30
  instructions?: string[];
  line_items: LineItem[];
  landing_page_configuration?: {
    partner_linkback_url?: string;
    enable_pantry_items?: boolean;
  };
  // If omitted, defaults to "production" so live users hit the prod IDP.
  // Pass "development" explicitly only for local QA.
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
    if (!Array.isArray(body?.line_items) || body.line_items.length === 0) {
      return json({ error: "line_items must be a non-empty array" }, 400);
    }
    if (body.line_items.length > 100) {
      return json({ error: "line_items may not exceed 100 entries" }, 400);
    }

    // Default to PRODUCTION for live users. Sandbox only when explicitly opted in.
    const env = body.environment === "development" ? "development" : "production";
    const base = env === "production" ? PROD_BASE : DEV_BASE;
    const url = `${base}/idp/v1/products/products_link`;

    const payload: Record<string, unknown> = {
      title: body.title,
      link_type: body.link_type ?? "shopping_list",
      expires_in: body.expires_in ?? 30,
      line_items: body.line_items,
    };
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
    return json({ ...data, environment: env });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("instacart-create-list error:", msg);
    return json({ error: msg }, 500);
  }
});
