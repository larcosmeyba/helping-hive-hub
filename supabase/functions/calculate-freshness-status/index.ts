// Recomputes freshness_status for all the caller's pantry items.
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";
import { adminClient, getUserIdFromAuth } from "../_shared/mealPlanContext.ts";
import { calcFreshness } from "../_shared/pantry.ts";

Deno.serve(async (req) => {
  const pf = handlePreflight(req); if (pf) return pf;
  const cors = buildCorsHeaders(req);
  try {
    const userId = await getUserIdFromAuth(req);
    if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    const admin = adminClient();
    const { data: items } = await admin.from("pantry_items").select("id, expiration_date, is_low_stock, freshness_status").eq("user_id", userId);
    let updated = 0;
    for (const it of items ?? []) {
      const f = calcFreshness(it.expiration_date ?? null, !!it.is_low_stock);
      if (f !== it.freshness_status) {
        await admin.from("pantry_items").update({ freshness_status: f }).eq("id", it.id);
        updated++;
      }
    }
    return new Response(JSON.stringify({ ok: true, updated }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
