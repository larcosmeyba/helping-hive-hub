// Saves user-confirmed items from a photo scan into pantry_items.
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";
import { adminClient, getUserIdFromAuth } from "../_shared/mealPlanContext.ts";
import { calcFreshness, normalize } from "../_shared/pantry.ts";

Deno.serve(async (req) => {
  const pf = handlePreflight(req); if (pf) return pf;
  const cors = buildCorsHeaders(req);
  try {
    const userId = await getUserIdFromAuth(req);
    if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    const { photo_id, items } = await req.json().catch(() => ({}));
    if (!Array.isArray(items) || !items.length)
      return new Response(JSON.stringify({ error: "items required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    const admin = adminClient();
    const rows = items.map((i: any) => ({
      user_id: userId,
      item_name: i.item_name,
      normalized_item_name: normalize(i.item_name),
      quantity: i.quantity ?? null,
      unit: i.unit ?? null,
      category: i.category ?? "other",
      location: i.location ?? "pantry",
      expiration_date: i.expiration_date ?? null,
      is_low_stock: !!i.low_stock,
      freshness_status: calcFreshness(i.expiration_date ?? null, !!i.low_stock),
      manually_added: false,
      photo_detected: true,
    }));
    const { data, error } = await admin.from("pantry_items").insert(rows).select();
    if (error) throw error;
    if (photo_id) {
      await admin.from("inventory_photos").update({ ai_processed: true }).eq("id", photo_id).eq("user_id", userId);
    }
    return new Response(JSON.stringify({ ok: true, added: data?.length ?? 0, items: data }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
