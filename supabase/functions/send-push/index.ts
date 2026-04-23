// Sends a push notification to a user's registered devices via FCM (Android)
// and APNs (iOS).
//
// Authorization: caller must either be the target user, or an owner/admin
// acting on their behalf.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
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
}

async function sendFcm(token: string, payload: PushPayload) {
  const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY");
  if (!FCM_SERVER_KEY) return { skipped: "fcm_not_configured" };

  const res = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      Authorization: `key=${FCM_SERVER_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: token,
      notification: { title: payload.title, body: payload.body },
      data: { link: payload.link ?? "", ...(payload.data ?? {}) },
    }),
  });
  return { status: res.status, body: await res.text() };
}

async function sendApns(_token: string, _payload: PushPayload) {
  const APNS_AUTH_KEY = Deno.env.get("APNS_AUTH_KEY");
  if (!APNS_AUTH_KEY) return { skipped: "apns_not_configured" };
  return { skipped: "apns_pending_implementation" };
}

Deno.serve(async (req) => {
  const pf = handlePreflight(req);
  if (pf) return pf;
  const cors = buildCorsHeaders(req);

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: cors });
  }

  try {
    // ---- Auth: require a valid bearer token ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // Skip caller-identity check for service-role calls (e.g. engagement-runner)
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

    // Detect service-role JWT (used by other edge functions / cron). If present,
    // skip the per-user authz check.
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
      // Caller is allowed if pushing to themselves OR they are owner/admin
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

    const { data: tokens } = await admin
      .from("push_tokens")
      .select("token, platform")
      .eq("user_id", payload.user_id);

    const results: any[] = [];
    for (const t of tokens ?? []) {
      if (t.platform === "android") {
        results.push({ token: t.token, ...(await sendFcm(t.token, payload)) });
      } else if (t.platform === "ios") {
        results.push({ token: t.token, ...(await sendApns(t.token, payload)) });
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
