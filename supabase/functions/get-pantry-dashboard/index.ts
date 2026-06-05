// Returns pantry dashboard stats: totals, expiring soon, low stock, estimated savings.
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
    const { data: items } = await admin.from("pantry_items").select("*").eq("user_id", userId);
    const rows = (items ?? []).filter((i: any) => !i.checked_off && !i.is_out_of_stock);
    let expiringSoon = 0, lowStock = 0, savings = 0;
    for (const it of rows as any[]) {
      const f = calcFreshness(it.expiration_date ?? null, !!it.is_low_stock);
      if (f === "use_soon" || f === "expiring_today") {
        expiringSoon++;
        savings += Number(it.estimated_value ?? 3); // mock $3/item if no value
      }
      if (it.is_low_stock || f === "low_stock") lowStock++;
    }
    return new Response(JSON.stringify({
      total_pantry_items: rows.length,
      expiring_soon_count: expiringSoon,
      low_stock_count: lowStock,
      estimated_savings_this_week: Math.round(savings * 100) / 100,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
