// Kroger OAuth callback — exchanges code for tokens, stores per-user.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  getKrogerBaseUrl,
  getKrogerCreds,
  getKrogerEnv,
  getServiceClient,
} from "../_shared/kroger.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  const finish = (target: string) =>
    new Response(null, { status: 302, headers: { Location: target } });

  if (errorParam) return finish(`/dashboard/settings?kroger=error`);
  if (!code || !state) return finish(`/dashboard/settings?kroger=missing`);

  const supabase = getServiceClient();
  const { data: st } = await supabase
    .from("kroger_oauth_states")
    .select("user_id, redirect_after, expires_at")
    .eq("state", state)
    .maybeSingle();

  if (!st || new Date(st.expires_at).getTime() < Date.now()) {
    return finish(`/dashboard/settings?kroger=expired`);
  }
  await supabase.from("kroger_oauth_states").delete().eq("state", state);

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
      console.error("Kroger token exchange failed", res.status, t);
      return finish(`${st.redirect_after}?kroger=token_error`);
    }
    const tok = await res.json();
    const expiresAt = new Date(Date.now() + (tok.expires_in ?? 1800) * 1000).toISOString();
    await supabase.from("kroger_user_tokens").upsert(
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
    return finish(`${st.redirect_after}?kroger=connected`);
  } catch (e) {
    console.error(e);
    return finish(`${st.redirect_after}?kroger=error`);
  }
});
