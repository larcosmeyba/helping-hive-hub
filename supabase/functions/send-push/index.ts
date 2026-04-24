// Sends a push notification to a user's registered devices via FCM HTTP v1
// (Android) and APNs HTTP/2 with JWT auth (iOS).
//
// Required secrets:
//   - APNS_AUTH_KEY     (.p8 PEM contents)
//   - APNS_KEY_ID       (10-char Key ID from Apple Developer)
//   - APNS_TEAM_ID      (10-char Team ID from Apple Developer)
//   - APNS_BUNDLE_ID    (e.g. com.helpthehive)
//   - APNS_ENV          (optional: "production" | "sandbox", default "production")
//   - FCM_SERVICE_ACCOUNT_JSON  (full JSON of Firebase service account key)
//
// Authorization: caller must either be the target user, or an owner/admin
// acting on their behalf, or service-role (cron / other edge fns).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { create as createJwt, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

interface PushPayload {
  user_id: string;
  title: string;
  body: string;
  link?: string;
  data?: Record<string, string>;
  category?: "meal_plan_reminders" | "snap_deposit_alerts" | "new_features";
}

// ---------- APNs ----------

let apnsTokenCache: { token: string; exp: number } | null = null;

async function importP8(pem: string): Promise<CryptoKey> {
  const cleaned = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
}

async function getApnsJwt(): Promise<string | null> {
  const keyId = Deno.env.get("APNS_KEY_ID");
  const teamId = Deno.env.get("APNS_TEAM_ID");
  const authKey = Deno.env.get("APNS_AUTH_KEY");
  if (!keyId || !teamId || !authKey) return null;

  const now = Math.floor(Date.now() / 1000);
  if (apnsTokenCache && apnsTokenCache.exp > now + 60) return apnsTokenCache.token;

  const key = await importP8(authKey);
  const jwt = await createJwt(
    { alg: "ES256", kid: keyId, typ: "JWT" },
    { iss: teamId, iat: now },
    key
  );
  // APNs tokens are valid up to 1 hour; refresh every ~50 min
  apnsTokenCache = { token: jwt, exp: now + 50 * 60 };
  return jwt;
}

async function sendApns(deviceToken: string, payload: PushPayload) {
  const jwt = await getApnsJwt();
  const bundleId = Deno.env.get("APNS_BUNDLE_ID");
  if (!jwt || !bundleId) return { skipped: "apns_not_configured" };

  const env = Deno.env.get("APNS_ENV") ?? "production";
  const host =
    env === "sandbox" ? "api.sandbox.push.apple.com" : "api.push.apple.com";

  const apsBody = {
    aps: {
      alert: { title: payload.title, body: payload.body },
      sound: "default",
      "mutable-content": 1,
    },
    link: payload.link ?? "",
    ...(payload.data ?? {}),
  };

  const res = await fetch(`https://${host}/3/device/${deviceToken}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${jwt}`,
      "apns-topic": bundleId,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    },
    body: JSON.stringify(apsBody),
  });

  return {
    status: res.status,
    body: res.status === 200 ? "ok" : await res.text(),
  };
}

// ---------- FCM HTTP v1 ----------

let fcmTokenCache: { token: string; exp: number } | null = null;

async function importPkcs8Rsa(pem: string): Promise<CryptoKey> {
  const cleaned = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function getFcmAccessToken(): Promise<{ token: string; projectId: string } | null> {
  const raw = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
  if (!raw) return null;
  let sa: { client_email: string; private_key: string; project_id: string };
  try {
    sa = JSON.parse(raw);
  } catch {
    console.error("[send-push] FCM_SERVICE_ACCOUNT_JSON is not valid JSON");
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (fcmTokenCache && fcmTokenCache.exp > now + 60) {
    return { token: fcmTokenCache.token, projectId: sa.project_id };
  }

  const key = await importPkcs8Rsa(sa.private_key);
  const jwt = await createJwt(
    { alg: "RS256", typ: "JWT" },
    {
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: getNumericDate(60 * 60),
    },
    key
  );

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    console.error("[send-push] FCM token exchange failed", res.status, await res.text());
    return null;
  }
  const json = await res.json() as { access_token: string; expires_in: number };
  fcmTokenCache = { token: json.access_token, exp: now + json.expires_in };
  return { token: json.access_token, projectId: sa.project_id };
}

async function sendFcm(deviceToken: string, payload: PushPayload) {
  const auth = await getFcmAccessToken();
  if (!auth) return { skipped: "fcm_not_configured" };

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${auth.projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: deviceToken,
          notification: { title: payload.title, body: payload.body },
          data: { link: payload.link ?? "", ...(payload.data ?? {}) },
        },
      }),
    }
  );
  return {
    status: res.status,
    body: res.status === 200 ? "ok" : await res.text(),
  };
}

// ---------- Handler ----------

Deno.serve(async (req) => {
  const pf = handlePreflight(req);
  if (pf) return pf;
  const cors = buildCorsHeaders(req);

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: cors });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.slice("Bearer ".length).trim();
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser(token);
    const caller = userData?.user ?? null;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const payload = (await req.json()) as PushPayload;
    if (!payload.user_id || !payload.title || !payload.body) {
      return new Response(
        JSON.stringify({ ok: false, error: "missing fields" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    let isServiceRole = false;
    try {
      const parts = token.split(".");
      if (parts.length >= 2) {
        const claims = JSON.parse(
          atob(parts[1].replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(parts[1].length / 4) * 4, "="))
        );
        isServiceRole = claims?.role === "service_role";
      }
    } catch {
      isServiceRole = false;
    }

    if (!isServiceRole) {
      if (!caller) {
        return new Response(
          JSON.stringify({ ok: false, error: "Unauthorized" }),
          { status: 401, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }
      if (caller.id !== payload.user_id) {
        const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: caller.id });
        if (!isAdmin) {
          return new Response(
            JSON.stringify({ ok: false, error: "Forbidden" }),
            { status: 403, headers: { ...cors, "Content-Type": "application/json" } }
          );
        }
      }
    }

    if (payload.category) {
      const { data: profile } = await admin
        .from("profiles")
        .select("notification_preferences")
        .eq("user_id", payload.user_id)
        .maybeSingle();
      const prefs = (profile?.notification_preferences ?? {}) as Record<string, boolean>;
      if (prefs[payload.category] === false) {
        return new Response(
          JSON.stringify({ ok: true, sent: 0, skipped: "category_opt_out" }),
          { headers: { ...cors, "Content-Type": "application/json" } }
        );
      }
    }

    const { data: tokens } = await admin
      .from("push_tokens")
      .select("token, platform")
      .eq("user_id", payload.user_id);

    const results: Array<Record<string, unknown>> = [];
    for (const t of tokens ?? []) {
      if (t.platform === "android") {
        results.push({ token: t.token, platform: "android", ...(await sendFcm(t.token, payload)) });
      } else if (t.platform === "ios") {
        results.push({ token: t.token, platform: "ios", ...(await sendApns(t.token, payload)) });
      }
    }

    return new Response(
      JSON.stringify({ ok: true, sent: results.length, results }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[send-push] error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
