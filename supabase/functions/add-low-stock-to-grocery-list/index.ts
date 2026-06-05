// Sends selected low-stock pantry items to grocery_list_items on the user's active grocery list.
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";
import { adminClient, getUserIdFromAuth } from "../_shared/mealPlanContext.ts";

Deno.serve(async (req) => {
  const pf = handlePreflight(req); if (pf) return pf;
  const cors = buildCorsHeaders(req);
  try {
    const userId = await getUserIdFromAuth(req);
    if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    const { pantry_item_ids } = await req.json().catch(() => ({}));
    if (!Array.isArray(pantry_item_ids) || !pantry_item_ids.length)
      return new Response(JSON.stringify({ error: "pantry_item_ids required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    const admin = adminClient();
    const { data: items } = await admin.from("pantry_items").select("*").in("id", pantry_item_ids).eq("user_id", userId);
    if (!items?.length)
      return new Response(JSON.stringify({ error: "No matching items" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });

    // Find or create an active grocery list
    let { data: list } = await admin.from("grocery_lists").select("*")
      .eq("user_id", userId).eq("status", "active")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!list) {
      const { data: created, error: createErr } = await admin.from("grocery_lists")
        .insert({ user_id: userId, status: "active", estimated_total: 0 }).select().single();
      if (createErr) throw createErr;
      list = created;
    }

    const rows = items.map((it: any) => ({
      user_id: userId,
      grocery_list_id: list!.id,
      ingredient_name: it.item_name,
      quantity: it.quantity ?? "1",
      unit: it.unit ?? null,
      category: it.category ?? "other",
      store_section: it.category ?? null,
      already_have: false,
      source_type: "pantry_low_stock",
      source_ref_id: it.id,
      instacart_search_term: it.item_name,
    }));
    const { data: inserted, error: insErr } = await admin.from("grocery_list_items").insert(rows).select();
    if (insErr) throw insErr;
    return new Response(JSON.stringify({ ok: true, added: inserted?.length ?? 0, grocery_list_id: list.id }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
