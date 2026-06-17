// Shared Kroger API helper.
// Switches between Certification (sandbox) and Production via the
// KROGER_ENV secret — no code changes required to promote.

import { createClient } from "npm:@supabase/supabase-js@2";

export type KrogerEnv = "certification" | "production";

export function getKrogerEnv(): KrogerEnv {
  const v = (Deno.env.get("KROGER_ENV") || "certification").toLowerCase();
  return v === "production" ? "production" : "certification";
}

export function getKrogerBaseUrl(env: KrogerEnv = getKrogerEnv()): string {
  return env === "production"
    ? "https://api.kroger.com/v1"
    : "https://api-ce.kroger.com/v1";
}

export function getKrogerCreds(env: KrogerEnv = getKrogerEnv()): {
  clientId: string;
  clientSecret: string;
} {
  if (env === "production") {
    return {
      clientId: Deno.env.get("KROGER_PROD_CLIENT_ID") ?? "",
      clientSecret: Deno.env.get("KROGER_PROD_CLIENT_SECRET") ?? "",
    };
  }
  return {
    clientId: Deno.env.get("KROGER_CERT_CLIENT_ID") ?? "",
    clientSecret: Deno.env.get("KROGER_CERT_CLIENT_SECRET") ?? "",
  };
}

export function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

// ---------------------------------------------------------------------------
// Client-credentials token (server-to-server, cached in DB)
// ---------------------------------------------------------------------------

export async function getAppToken(scope = "product.compact"): Promise<string> {
  const env = getKrogerEnv();
  const supabase = getServiceClient();

  const { data: cached } = await supabase
    .from("kroger_access_tokens")
    .select("access_token, expires_at, scope")
    .eq("environment", env)
    .maybeSingle();

  if (
    cached?.access_token &&
    new Date(cached.expires_at).getTime() - 60_000 > Date.now() &&
    (cached.scope ?? "") === scope
  ) {
    return cached.access_token;
  }

  const { clientId, clientSecret } = getKrogerCreds(env);
  if (!clientId || !clientSecret) {
    throw new Error("Kroger credentials are not configured for env " + env);
  }

  const basic = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch(`${getKrogerBaseUrl(env)}/connect/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=client_credentials&scope=${encodeURIComponent(scope)}`,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kroger token error ${res.status}: ${text}`);
  }
  const json = await res.json();
  const expiresAt = new Date(Date.now() + (json.expires_in ?? 1800) * 1000)
    .toISOString();

  await supabase.from("kroger_access_tokens").upsert(
    {
      environment: env,
      access_token: json.access_token,
      token_type: json.token_type,
      scope,
      expires_at: expiresAt,
    },
    { onConflict: "environment" },
  );

  return json.access_token as string;
}

// ---------------------------------------------------------------------------
// Thin REST helper
// ---------------------------------------------------------------------------

export async function krogerGet<T = unknown>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  token?: string,
): Promise<T> {
  const access = token ?? (await getAppToken());
  const url = new URL(`${getKrogerBaseUrl()}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${access}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kroger ${path} ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}
