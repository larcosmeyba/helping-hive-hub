// Add a manual pantry item.
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";
import { adminClient, getUserIdFromAuth } from "../_shared/mealPlanContext.ts";
import { calcFreshness, normalize } from "../_shared/pantry.ts";

Deno.serve(async (req) => {
  const pf = handlePreflight(req); if (pf) return pf;
  const cors = buildCorsHeaders(req);
  try {
    const userId = await getUserIdFromAuth(req);
    if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    const body = await req.json().catch(() => ({}));
    const {
      item_name, quantity, unit, category, location, purchase_date, expiration_date, low_stock, estimated_value,
      photo_detected, receipt_detected,
    } = body || {};
    if (!item_name) return new Response(JSON.stringify({ error: "item_name required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    const freshness = calcFreshness(expiration_date ?? null, !!low_stock);
    const admin = adminClient();
    const { data, error } = await admin.from("pantry_items").insert({
      user_id: userId,
      item_name,
      normalized_item_name: normalize(item_name),
      quantity: quantity ?? null,
      unit: unit ?? null,
      category: category ?? "other",
      location: location ?? "pantry",
      purchase_date: purchase_date ?? null,
      expiration_date: expiration_date ?? null,
      is_low_stock: !!low_stock,
      freshness_status: freshness,
      estimated_value: estimated_value ?? null,
      manually_added: !photo_detected && !receipt_detected,
      photo_detected: !!photo_detected,
      receipt_detected: !!receipt_detected,
    }).select().single();
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, item: data }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
