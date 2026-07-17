// seed-starter-pantry: production-safe starter inventory seed.
// Any authenticated user may trigger it while STARTER_PANTRY_SEED_ENABLED=true.

import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";
import { adminClient, getUserIdFromAuth } from "../_shared/mealPlanContext.ts";
import {
  runStarterPantrySeed,
  starterPantrySeedEnabled,
} from "../_shared/starterPantrySeed.ts";

Deno.serve(async (req) => {
  const pf = handlePreflight(req);
  if (pf) return pf;
  const cors = buildCorsHeaders(req);

  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405, cors);
  }

  const enabled = starterPantrySeedEnabled(Deno.env.get("STARTER_PANTRY_SEED_ENABLED"));
  if (!enabled) {
    const result = await runStarterPantrySeed({
      enabled,
      userId: null,
      loadExisting: async () => [],
      insertRows: async () => 0,
    });
    return json(result.body, result.status, cors);
  }

  try {
    const userId = await getUserIdFromAuth(req);
    const admin = adminClient();
    const result = await runStarterPantrySeed({
      enabled,
      userId,
      loadExisting: async (uid) => {
        const { data, error } = await admin
          .from("pantry_items")
          .select("item_name, normalized_item_name")
          .eq("user_id", uid);
        if (error) throw error;
        return data ?? [];
      },
      insertRows: async (rows) => {
        const { data, error } = await admin
          .from("pantry_items")
          .insert(rows)
          .select("id");
        if (error) throw error;
        return data?.length ?? rows.length;
      },
    });
    return json(result.body, result.status, cors);
  } catch (err) {
    return json({ ok: false, added: 0, skipped: 0, disabled: false, error: (err as Error).message }, 500, cors);
  }
});

function json(payload: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
