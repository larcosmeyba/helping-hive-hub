// Instacart Developer Platform — list retailers available for a postal code.
// Docs: https://docs.instacart.com/developer_platform_api/api/retailers
// GET {base}/idp/v1/retailers?postal_code=&country_code=US
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";

const DEV_BASE = "https://connect.dev.instacart.tools";
const PROD_BASE = "https://connect.instacart.com";

interface RetailerOut {
  retailer_key: string;
  name: string;
  retailer_logo_url?: string | null;
  address?: Record<string, unknown> | null;
  distance?: number | null;
}

// In-memory TTL cache (per cold-start) — Instacart's retailer list changes
// slowly; cache for 6h to limit upstream calls.
const CACHE = new Map<string, { at: number; data: RetailerOut[] }>();
const TTL_MS = 6 * 60 * 60 * 1000;

// Simple per-IP rate limit (60 req / 60s) to prevent abuse. The 6h cache
// above already shields upstream Instacart on repeat ZIPs; this caps the
// raw request rate per client regardless of cache state.
const RL = new Map<string, { count: number; resetAt: number }>();
const RL_WINDOW_MS = 60_000;
const RL_MAX = 60;
function rateLimitOk(ip: string): boolean {
  const now = Date.now();
  const cur = RL.get(ip);
  if (!cur || now > cur.resetAt) {
    RL.set(ip, { count: 1, resetAt: now + RL_WINDOW_MS });
    return true;
  }
  cur.count += 1;
  return cur.count <= RL_MAX;
}
function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") ?? "";
  return xff.split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "unknown";
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
    const ip = clientIp(req);
    if (!rateLimitOk(ip)) {
      return json({ error: "Too many requests. Try again in a minute." }, 429);
    }
    const url = new URL(req.url);
    const postal = (url.searchParams.get("postal_code") ?? "").trim();
    const country = (url.searchParams.get("country_code") ?? "US").trim().toUpperCase();
    const envParam = url.searchParams.get("environment");
    const env = envParam === "development" ? "development" : "production";

    if (!/^\d{5}$/.test(postal)) {
      return json({ error: "postal_code must be a 5-digit US ZIP" }, 400);
    }

    const cacheKey = `${env}:${country}:${postal}`;
    const hit = CACHE.get(cacheKey);
    if (hit && Date.now() - hit.at < TTL_MS) {
      return json({ retailers: hit.data, cached: true });
    }

    const apiKey =
      env === "development"
        ? Deno.env.get("Instacart_API_KEY_DEVELOPMENT") ??
          Deno.env.get("INSTACART_API_KEY_DEVELOPMENT") ??
          Deno.env.get("INSTACART_API_KEY")
        : Deno.env.get("INSTACART_API_KEY");
    if (!apiKey) {
      return json({ error: `Instacart API key not configured for ${env}` }, 500);
    }

    const base = env === "production" ? PROD_BASE : DEV_BASE;
    const upstream = `${base}/idp/v1/retailers?postal_code=${encodeURIComponent(postal)}&country_code=${encodeURIComponent(country)}`;

    const res = await fetch(upstream, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("[instacart-retailers] upstream error", res.status, text);
      return json({ error: "Instacart retailers lookup failed", status: res.status, detail: text }, 502);
    }

    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { parsed = {}; }
    const raw = (parsed as { retailers?: unknown })?.retailers;
    const list: RetailerOut[] = Array.isArray(raw)
      ? raw.map((r) => {
          const o = r as Record<string, unknown>;
          return {
            retailer_key: String(o.retailer_key ?? ""),
            name: String(o.name ?? ""),
            retailer_logo_url: (o.retailer_logo_url as string) ?? null,
            address: (o.address as Record<string, unknown>) ?? null,
            distance: typeof o.distance === "number" ? o.distance : null,
          };
        }).filter((r) => r.retailer_key && r.name)
      : [];

    CACHE.set(cacheKey, { at: Date.now(), data: list });
    return json({ retailers: list, cached: false });
  } catch (e) {
    console.error("[instacart-retailers] error", e);
    return json({ error: (e as Error).message ?? "unknown error" }, 500);
  }
});
