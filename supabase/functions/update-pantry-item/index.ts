// Update a pantry item. Recomputes freshness_status.
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";
import { adminClient, getUserIdFromAuth } from "../_shared/mealPlanContext.ts";
import { calcFreshness } from "../_shared/pantry.ts";

Deno.serve(async (req) => {
  const pf = handlePreflight(req); if (pf) return pf;
  const cors = buildCorsHeaders(req);
  try {
    const userId = await getUserIdFromAuth(req);
    if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    const { id, patch } = await req.json().catch(() => ({}));
    if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    const admin = adminClient();
    const { data: existing } = await admin.from("pantry_items").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
    if (!existing) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });

    const merged = { ...existing, ...(patch || {}) };
    const freshness = calcFreshness(merged.expiration_date ?? null, !!merged.is_low_stock);

    const { data, error } = await admin.from("pantry_items")
      .update({ ...(patch || {}), freshness_status: freshness })
      .eq("id", id).eq("user_id", userId).select().single();
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, item: data }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
