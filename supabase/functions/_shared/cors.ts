// Shared CORS helper for edge functions.
// Reads ALLOWED_ORIGINS env var (comma-separated) and echoes back the request
// origin only if it's in the allowlist. Falls back to a sensible default that
// covers the production app, custom domain, capacitor:// (iOS shell) and
// localhost dev.
//
// Usage:
//   import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";
//   const cors = buildCorsHeaders(req);
//   const pf = handlePreflight(req); if (pf) return pf;

const DEFAULT_ALLOWED = [
  "https://helpthehive.com",
  "https://www.helpthehive.com",
  "https://helping-hive-hub.lovable.app",
  "https://id-preview--bf8fd03f-0e47-4e05-b2a3-0c914e6bd586.lovable.app",
  "capacitor://localhost",
  "http://localhost",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8080",
];

const ALLOW_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";

function getAllowedOrigins(): string[] {
  const env = Deno.env.get("ALLOWED_ORIGINS");
  if (!env) return DEFAULT_ALLOWED;
  return env.split(",").map((s) => s.trim()).filter(Boolean);
}

export function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = getAllowedOrigins();
  // Strict allowlist only — no wildcard *.lovable.app match. Any new preview
  // origin must be added explicitly via ALLOWED_ORIGINS env or DEFAULT_ALLOWED.
  const allow = allowed.includes(origin);
  return {
    "Access-Control-Allow-Origin": allow ? origin : allowed[0],
    "Access-Control-Allow-Headers": ALLOW_HEADERS,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    Vary: "Origin",
  };
}

export function handlePreflight(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  return new Response(null, { headers: buildCorsHeaders(req) });
}
