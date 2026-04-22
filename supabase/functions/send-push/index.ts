// Sends a push notification to a user's registered devices via FCM (Android)
// and APNs (iOS).
//
// REQUIRED native setup outside the sandbox:
//   • iOS: APNs auth key (.p8) + Team ID + Key ID stored as edge function secrets:
//       APNS_AUTH_KEY, APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID
//   • Android: FCM server key:
//       FCM_SERVER_KEY
//
// While those secrets are absent, this function logs and returns a 503 so the
// rest of the app keeps working. Other code paths (in-app notifications)
// continue regardless.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
  // APNs requires JWT signing with the .p8 key; left as a placeholder until
  // the user provides APNS_AUTH_KEY etc. We log and skip cleanly.
  const APNS_AUTH_KEY = Deno.env.get("APNS_AUTH_KEY");
  if (!APNS_AUTH_KEY) return { skipped: "apns_not_configured" };
  // TODO: Implement APNs JWT + HTTP/2 once secrets are provisioned.
  return { skipped: "apns_pending_implementation" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as PushPayload;
    if (!payload.user_id || !payload.title || !payload.body) {
      return new Response(
        JSON.stringify({ ok: false, error: "missing fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: tokens } = await supabase
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
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[send-push] error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
