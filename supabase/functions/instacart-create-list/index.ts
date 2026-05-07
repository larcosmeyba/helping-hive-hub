// Instacart Developer Platform — Create "Shopping List" link
// Docs: https://docs.instacart.com/developer_platform_api/api/products_link
// Auth: single API key via `Authorization: Bearer <INSTACART_API_KEY>`

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
  expires_in?: number; // seconds; defaults to 30 days
  instructions?: string[];
  line_items: LineItem[];
  landing_page_configuration?: {
    partner_linkback_url?: string;
    enable_pantry_items?: boolean;
  };
  environment?: "development" | "production";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("INSTACART_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "INSTACART_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = (await req.json()) as CreateListBody;

    if (!body?.title || !Array.isArray(body?.line_items) || body.line_items.length === 0) {
      return new Response(
        JSON.stringify({ error: "title and non-empty line_items are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const env = body.environment === "production" ? "production" : "development";
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

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error("Instacart IDP error:", res.status, text);
      return new Response(
        JSON.stringify({ error: "Instacart API error", status: res.status, details: text }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = JSON.parse(text);
    // Successful response includes `products_link_url` — that's the URL to send users to.
    return new Response(
      JSON.stringify({ ...data, environment: env }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("instacart-create-list error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
