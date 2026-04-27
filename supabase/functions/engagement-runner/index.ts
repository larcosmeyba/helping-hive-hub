// Scheduled engagement runner.
// Triggered by pg_cron daily. Creates in-app notifications and queues transactional
// emails for: weekly recap (Sun), SNAP deposit reminder (1 day before), and
// re-engagement (users inactive 7+ days).
//
// Authorization: only the service role (cron) or an owner/admin user may invoke.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";
import { timingSafeEqual } from "../_shared/timing-safe-equal.ts";

type AnySupabaseClient = SupabaseClient<any, "public", any>;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

interface Profile {
  user_id: string;
  email: string | null;
  display_name: string | null;
  snap_status: boolean | null;
  snap_deposit_day: number | null;
  last_active: string | null;
  notification_preferences: Record<string, boolean> | null;
  weekly_budget: number | null;
}

function isoWeekStart(d = new Date()): string {
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day;
  const ws = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
  return ws.toISOString().slice(0, 10);
}

async function alreadySent(
  supabase: AnySupabaseClient,
  userId: string,
  emailType: string,
  periodKey: string
) {
  const { data } = await supabase
    .from("engagement_email_log")
    .select("id")
    .eq("user_id", userId)
    .eq("email_type", emailType)
    .eq("period_key", periodKey)
    .maybeSingle();
  return !!data;
}

async function recordSent(
  supabase: AnySupabaseClient,
  userId: string,
  emailType: string,
  periodKey: string
) {
  await supabase.from("engagement_email_log").insert({
    user_id: userId,
    email_type: emailType,
    period_key: periodKey,
  });
}

async function createNotification(
  supabase: AnySupabaseClient,
  userId: string,
  type: string,
  title: string,
  body: string,
  link?: string
) {
  await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body,
    link: link ?? null,
  });
}

function isServiceRoleToken(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return false;
    const payload = parts[1]
      .replaceAll("-", "+")
      .replaceAll("_", "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
    const claims = JSON.parse(atob(payload));
    return claims?.role === "service_role";
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  const pf = handlePreflight(req);
  if (pf) return pf;
  const cors = buildCorsHeaders(req);

  // ---- Authz: CRON_SECRET header (cron) OR service role JWT OR owner/admin ----
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const CRON_SECRET = Deno.env.get("CRON_SECRET");
  const cronHeader = req.headers.get("x-cron-secret");
  // Constant-time compare to avoid timing-attack inference on the shared secret.
  const isCronCall =
    !!CRON_SECRET && !!cronHeader && timingSafeEqual(cronHeader, CRON_SECRET);

  if (!isCronCall) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.slice("Bearer ".length).trim();

    if (!isServiceRoleToken(token)) {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData } = await userClient.auth.getUser(token);
      const caller = userData?.user;
      if (!caller) {
        return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
          status: 401, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: caller.id });
      if (!isAdmin) {
        return new Response(JSON.stringify({ ok: false, error: "Forbidden" }), {
          status: 403, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
    }
  }

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "all";

  const summary = { weekly_recap: 0, snap_reminder: 0, re_engagement: 0 };

  try {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select(
        "user_id, email, display_name, snap_status, snap_deposit_day, last_active, notification_preferences, weekly_budget"
      );
    if (error) throw error;
    const all = (profiles ?? []) as Profile[];

    const today = new Date();
    const dayOfWeek = today.getUTCDay();
    const weekKey = isoWeekStart(today);
    const dateKey = today.toISOString().slice(0, 10);

    for (const p of all) {
      if (!p.email) continue;
      const prefs = p.notification_preferences ?? {};

      if (
        (mode === "all" || mode === "weekly_recap") &&
        dayOfWeek === 0 &&
        prefs.email_weekly_recap !== false
      ) {
        if (!(await alreadySent(supabase, p.user_id, "weekly_recap", weekKey))) {
          await createNotification(
            supabase, p.user_id, "weekly_recap",
            "Your weekly recap is ready",
            "See how your meal plans and savings looked last week.",
            "/dashboard/budget-insights"
          );
          await recordSent(supabase, p.user_id, "weekly_recap", weekKey);
          summary.weekly_recap++;
        }
      }

      if (
        (mode === "all" || mode === "snap_reminder") &&
        p.snap_status &&
        p.snap_deposit_day &&
        prefs.email_snap_reminder !== false
      ) {
        const target = p.snap_deposit_day;
        const tomorrow = new Date(today);
        tomorrow.setUTCDate(today.getUTCDate() + 1);
        if (tomorrow.getUTCDate() === target) {
          const periodKey = `${today.getUTCFullYear()}-${today.getUTCMonth() + 1}`;
          if (!(await alreadySent(supabase, p.user_id, "snap_reminder", periodKey))) {
            await createNotification(
              supabase, p.user_id, "snap_deposit",
              "SNAP deposit tomorrow",
              `Your benefits arrive on the ${target}${
                target === 1 ? "st" : target === 2 ? "nd" : target === 3 ? "rd" : "th"
              }. Plan your shop now.`,
              "/dashboard"
            );
            await recordSent(supabase, p.user_id, "snap_reminder", periodKey);
            summary.snap_reminder++;
          }
        }
      }

      if (
        (mode === "all" || mode === "re_engagement") &&
        p.last_active &&
        prefs.email_re_engagement !== false
      ) {
        const lastActive = new Date(p.last_active);
        const daysSince = Math.floor((today.getTime() - lastActive.getTime()) / 86400000);
        if (daysSince >= 7) {
          const periodKey = `${today.getUTCFullYear()}-W${Math.floor(today.getUTCDate() / 14)}`;
          if (!(await alreadySent(supabase, p.user_id, "re_engagement", periodKey))) {
            await createNotification(
              supabase, p.user_id, "re_engagement",
              "We miss you at the Hive",
              "Generate a fresh meal plan in seconds — your budget is waiting.",
              "/dashboard"
            );
            await recordSent(supabase, p.user_id, "re_engagement", periodKey);
            summary.re_engagement++;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, date: dateKey, summary }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[engagement-runner] error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
