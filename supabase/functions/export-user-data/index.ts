// Returns a JSON export of everything we store about the requesting user.
// Authenticated; only ever returns the caller's own data.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const pf = handlePreflight(req);
  if (pf) return pf;
  const corsHeaders = buildCorsHeaders(req);

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not authenticated" }, 401);

    const client = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await client.auth.getUser();
    if (userErr || !user) return json({ error: "Invalid session" }, 401);

    const tables = [
      "profiles",
      "meal_plans", "meal_plan_days", "meal_plan_meals", "meal_ingredients",
      "grocery_lists", "grocery_list_items",
      "pantry_items", "food_waste_logs",
      "support_tickets", "user_feedback",
    ] as const;

    const exported: Record<string, unknown> = {
      exported_at: new Date().toISOString(),
      account: { id: user.id, email: user.email, created_at: user.created_at },
    };
    for (const table of tables) {
      const { data } = await client.from(table).select("*").eq("user_id", user.id);
      exported[table] = data ?? [];
    }

    return new Response(JSON.stringify(exported, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="helpthehive-data-${user.id}.json"`,
      },
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
