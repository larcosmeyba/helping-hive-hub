// Kroger OAuth callback — exchanges code for tokens, stores per-user.
// Always redirects to an ABSOLUTE app URL so the browser doesn't try to
// resolve the Location against the Supabase functions domain (which
// returns {"error":"requested path is invalid"}).

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  getKrogerBaseUrl,
  getKrogerCreds,
  getKrogerEnv,
  getServiceClient,
} from "../_shared/kroger.ts";

const ALLOWED_APP_ORIGINS = [
  "https://helpthehive.com",
  "https://www.helpthehive.com",
  "https://helping-hive-hub.lovable.app",
  "https://id-preview--bf8fd03f-0e47-4e05-b2a3-0c914e6bd586.lovable.app",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000",
];
const DEFAULT_APP_ORIGIN = "https://helpthehive.com";

function toAbsoluteAppUrl(target: string, status: string): string {
  // Accept either an absolute URL or a path. Always returns an absolute URL
  // on an allowed app origin with ?kroger=<status> appended.
  try {
    if (target.startsWith("http://") || target.startsWith("https://")) {
      const u = new URL(target);
      const origin = ALLOWED_APP_ORIGINS.includes(u.origin)
        ? u.origin
        : DEFAULT_APP_ORIGIN;
      u.searchParams.set("kroger", status);
      return `${origin}${u.pathname}${u.search}`;
    }
  } catch { /* fall through */ }
  const path = target.startsWith("/") ? target : `/${target || "dashboard/settings"}`;
  const sep = path.includes("?") ? "&" : "?";
  return `${DEFAULT_APP_ORIGIN}${path}${sep}kroger=${encodeURIComponent(status)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const reqUrl = new URL(req.url);
  console.log("[kroger-oauth-callback] incoming:", req.url);
  const code = reqUrl.searchParams.get("code");
  const state = reqUrl.searchParams.get("state");
  const errorParam = reqUrl.searchParams.get("error");
  console.log("[kroger-oauth-callback] params:", {
    hasCode: !!code,
    state,
    errorParam,
  });

  const finish = (target: string, status: string) => {
    const loc = toAbsoluteAppUrl(target, status);
    console.log("[kroger-oauth-callback] redirecting ->", loc);
    return new Response(null, { status: 302, headers: { Location: loc } });
  };

  const fallback = `${DEFAULT_APP_ORIGIN}/dashboard/settings`;

  if (errorParam) return finish(fallback, "error");
  if (!code || !state) return finish(fallback, "missing");

  const supabase = getServiceClient();
  const { data: st, error: stErr } = await supabase
    .from("kroger_oauth_states")
    .select("user_id, redirect_after, expires_at")
    .eq("state", state)
    .maybeSingle();

  if (stErr) console.error("[kroger-oauth-callback] state lookup error:", stErr);
  if (!st) {
    console.warn("[kroger-oauth-callback] state not found:", state);
    return finish(fallback, "expired");
  }
  if (new Date(st.expires_at).getTime() < Date.now()) {
    return finish(st.redirect_after ?? fallback, "expired");
  }
  await supabase.from("kroger_oauth_states").delete().eq("state", state);

  const target = st.redirect_after ?? fallback;

  try {
    const env = getKrogerEnv();
    const { clientId, clientSecret } = getKrogerCreds(env);
    const basic = btoa(`${clientId}:${clientSecret}`);
    const redirectUri =
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/kroger-oauth-callback`;

    const res = await fetch(`${getKrogerBaseUrl(env)}/connect/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error("[kroger-oauth-callback] token exchange failed", res.status, t);
      return finish(target, "token_error");
    }
    const tok = await res.json();
    console.log("[kroger-oauth-callback] token exchange ok, scope:", tok.scope);
    const expiresAt = new Date(Date.now() + (tok.expires_in ?? 1800) * 1000).toISOString();
    const { error: upErr } = await supabase.from("kroger_user_tokens").upsert(
      {
        user_id: st.user_id,
        environment: env,
        access_token: tok.access_token,
        refresh_token: tok.refresh_token ?? null,
        scope: tok.scope ?? null,
        token_type: tok.token_type ?? "Bearer",
        expires_at: expiresAt,
      },
      { onConflict: "user_id,environment" },
    );
    if (upErr) {
      console.error("[kroger-oauth-callback] upsert error:", upErr);
      return finish(target, "save_error");
    }
    return finish(target, "connected");
  } catch (e) {
    console.error("[kroger-oauth-callback] exception:", e);
    return finish(target, "error");
  }
});
