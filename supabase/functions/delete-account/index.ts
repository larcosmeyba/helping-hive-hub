// Immediate hard-delete of the requesting user's account and all owned data.
// Uses the service role key so it can call auth.admin.deleteUser. The function
// authenticates the caller from their JWT and only ever deletes that caller's data.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not authenticated" }, 401);

    // Verify caller identity
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Invalid session" }, 401);

    const userId = user.id;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Audit record FIRST (kept after user row is gone)
    await admin.from("account_deletions").insert({
      user_id: userId,
      email: user.email,
      initiated_by: "self",
      reason: "User-initiated immediate deletion via Privacy Controls",
    });

    // Hard-delete owned rows. Order: dependents -> parents.
    const userScoped = [
      "grocery_list_items", "grocery_lists",
      "meal_plan_items", "meal_plans",
      "pantry_items", "food_waste_logs",
      "grocery_cost_comparisons",
      "verification_documents",
      "support_tickets", "user_feedback",
      "user_roles", "admin_permissions",
      "profiles",
    ];
    for (const table of userScoped) {
      await admin.from(table).delete().eq("user_id", userId);
    }

    // Finally remove the auth user
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) return json({ error: delErr.message }, 500);

    return json({ success: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
