// Shared Kroger API helper.
// Switches between Certification (sandbox) and Production via the
// KROGER_ENV secret — no code changes required to promote.

import { createClient } from "npm:@supabase/supabase-js@2";

export type KrogerEnv = "certification" | "production";

type KrogerCredentialDiagnostics = {
  environment: KrogerEnv;
  baseUrl: string;
  tokenUrl: string;
  scope: string;
  secretNames: {
    clientId: string;
    clientSecret: string;
  };
  clientId: {
    configured: boolean;
    length: number;
    prefix: string | null;
    fingerprint: string | null;
  };
  clientSecret: {
    configured: boolean;
    length: number;
    fingerprint: string | null;
  };
};

export class KrogerApiError extends Error {
  status?: number;
  operation: string;
  diagnostics?: Record<string, unknown>;

  constructor(
    message: string,
    opts: {
      status?: number;
      operation: string;
      diagnostics?: Record<string, unknown>;
    },
  ) {
    super(message);
    this.name = "KrogerApiError";
    this.status = opts.status;
    this.operation = opts.operation;
    this.diagnostics = opts.diagnostics;
  }
}

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

function krogerSecretNames(env: KrogerEnv): { clientId: string; clientSecret: string } {
  return env === "production"
    ? { clientId: "KROGER_PROD_CLIENT_ID", clientSecret: "KROGER_PROD_CLIENT_SECRET" }
    : { clientId: "KROGER_CERT_CLIENT_ID", clientSecret: "KROGER_CERT_CLIENT_SECRET" };
}

async function fingerprint(value: string): Promise<string | null> {
  if (!value) return null;
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .slice(0, 6)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getCredentialDiagnostics(
  env: KrogerEnv,
  scope: string,
): Promise<KrogerCredentialDiagnostics> {
  const creds = getKrogerCreds(env);
  const names = krogerSecretNames(env);
  return {
    environment: env,
    baseUrl: getKrogerBaseUrl(env),
    tokenUrl: `${getKrogerBaseUrl(env)}/connect/oauth2/token`,
    scope,
    secretNames: names,
    clientId: {
      configured: !!creds.clientId,
      length: creds.clientId.length,
      prefix: creds.clientId ? creds.clientId.slice(0, 6) : null,
      fingerprint: await fingerprint(creds.clientId),
    },
    clientSecret: {
      configured: !!creds.clientSecret,
      length: creds.clientSecret.length,
      fingerprint: await fingerprint(creds.clientSecret),
    },
  };
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function truncate(text: string, max = 500): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function headerDiagnostics(headers: Headers): Record<string, string> {
  const keys = [
    "www-authenticate",
    "x-correlation-id",
    "x-request-id",
    "x-kroger-correlation-id",
    "retry-after",
  ];
  const out: Record<string, string> = {};
  for (const key of keys) {
    const value = headers.get(key);
    if (value) out[key] = value;
  }
  return out;
}

function classifyTokenFailure(status: number, body: string): string {
  const lower = body.toLowerCase();
  if (status === 401) {
    return "Kroger rejected the client_id/client_secret for the active environment. Verify KROGER_ENV and the matching Kroger credential pair.";
  }
  if (status === 400 && lower.includes("invalid_scope")) {
    return "Kroger rejected the requested OAuth scope. Verify the app has product.compact enabled for this environment.";
  }
  if (status >= 500) {
    return "Kroger token endpoint returned a server error.";
  }
  return "Kroger token endpoint rejected the request.";
}

function scrubParams(
  params: Record<string, string | number | undefined>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    const lower = key.toLowerCase();
    if (lower.includes("zipcode") || lower.includes("zip")) {
      const s = String(value);
      out[key] = {
        configured: true,
        length: s.length,
        prefix: s.slice(0, 3),
      };
    } else {
      out[key] = value;
    }
  }
  return out;
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
    const diagnostics = await getCredentialDiagnostics(env, scope);
    console.error("[kroger] credentials missing", safeJson({
      event: "kroger_credentials_missing",
      ...diagnostics,
    }));
    throw new KrogerApiError("Kroger credentials are not configured for env " + env, {
      operation: "token",
      diagnostics,
    });
  }

  const basic = btoa(`${clientId}:${clientSecret}`);
  const tokenUrl = `${getKrogerBaseUrl(env)}/connect/oauth2/token`;
  let res: Response;
  try {
    res = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `grant_type=client_credentials&scope=${encodeURIComponent(scope)}`,
    });
  } catch (e) {
    const diagnostics = {
      event: "kroger_token_network_error",
      ...(await getCredentialDiagnostics(env, scope)),
      errorMessage: (e as Error).message,
    };
    console.error("[kroger] token request network error", safeJson(diagnostics));
    throw new KrogerApiError(`Kroger token network error: ${(e as Error).message}`, {
      operation: "token",
      diagnostics,
    });
  }

  if (!res.ok) {
    const text = await res.text();
    const body = truncate(text);
    const diagnostics = {
      event: "kroger_token_request_failed",
      ...(await getCredentialDiagnostics(env, scope)),
      status: res.status,
      statusText: res.statusText,
      responseHeaders: headerDiagnostics(res.headers),
      responseBody: body,
      probableCause: classifyTokenFailure(res.status, text),
    };
    console.warn("[kroger] token request failed", safeJson(diagnostics));
    throw new KrogerApiError(`Kroger token error ${res.status}: ${body}`, {
      status: res.status,
      operation: "token",
      diagnostics,
    });
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
    const diagnostics = {
      event: "kroger_rest_request_failed",
      environment: getKrogerEnv(),
      baseUrl: getKrogerBaseUrl(),
      path,
      params: scrubParams(params),
      status: res.status,
      statusText: res.statusText,
      responseHeaders: headerDiagnostics(res.headers),
      responseBody: truncate(text),
    };
    console.warn("[kroger] REST request failed", safeJson(diagnostics));
    throw new KrogerApiError(`Kroger ${path} ${res.status}: ${truncate(text)}`, {
      status: res.status,
      operation: path,
      diagnostics,
    });
  }
  return (await res.json()) as T;
}
