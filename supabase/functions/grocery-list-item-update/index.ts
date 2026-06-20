// grocery-list-item-update: persist user edits to grocery_list_items.
// Actions: remove, mark_already_have, set_quantity, substitute.
// RLS-scoped to the owner. Sentry-captured.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { adminClient, getUserIdFromAuth } from "../_shared/mealPlanContext.ts";
import { captureEdgeError } from "../_shared/sentry.ts";

type Action = "remove" | "mark_already_have" | "set_quantity" | "substitute";

interface Body {
  item_id: string;
  action: Action;
  // action-specific:
  already_have?: boolean;
  quantity?: string | number;
  ingredient_name?: string;     // substitute: new name
  estimated_price?: number;     // substitute: new price
  category?: string;            // substitute: optional new category
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const userId = await getUserIdFromAuth(req);
  if (!userId) {
    return json({ error: "Unauthorized" }, 401);
  }
  let body: Body;
  try { body = await req.json(); } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!body?.item_id || !body?.action) {
    return json({ error: "item_id and action required" }, 400);
  }

  const admin = adminClient();
  try {
    // Ownership guard
    const { data: row, error: getErr } = await admin
      .from("grocery_list_items")
      .select("id, user_id, grocery_list_id")
      .eq("id", body.item_id)
      .maybeSingle();
    if (getErr) throw getErr;
    if (!row || row.user_id !== userId) {
      return json({ error: "Not found" }, 404);
    }

    if (body.action === "remove") {
      const { error } = await admin
        .from("grocery_list_items")
        .delete()
        .eq("id", body.item_id)
        .eq("user_id", userId);
      if (error) throw error;
      return json({ ok: true, action: "remove" });
    }

    const update: Record<string, unknown> = {};
    if (body.action === "mark_already_have") {
      update.already_have = body.already_have ?? true;
      // Mirror onto store_section bucket prefix so the page re-renders in
      // the right section without recomputing.
      const { data: cur } = await admin
        .from("grocery_list_items")
        .select("store_section, category")
        .eq("id", body.item_id)
        .maybeSingle();
      const category = cur?.category ?? (cur?.store_section?.split(":")[1] ?? "Other");
      update.store_section = `${update.already_have ? "already_have" : "need_to_buy"}:${category}`;
    } else if (body.action === "set_quantity") {
      if (body.quantity == null) return json({ error: "quantity required" }, 400);
      update.quantity = String(body.quantity);
    } else if (body.action === "substitute") {
      if (!body.ingredient_name) return json({ error: "ingredient_name required" }, 400);
      update.ingredient_name = body.ingredient_name;
      if (typeof body.estimated_price === "number") update.estimated_price = body.estimated_price;
      if (body.category) {
        update.category = body.category;
        const { data: cur } = await admin
          .from("grocery_list_items")
          .select("store_section, already_have")
          .eq("id", body.item_id)
          .maybeSingle();
        const bucket = cur?.already_have ? "already_have" : (cur?.store_section?.split(":")[0] ?? "need_to_buy");
        update.store_section = `${bucket}:${body.category}`;
      }
    } else {
      return json({ error: "Unknown action" }, 400);
    }

    const { data: updated, error: upErr } = await admin
      .from("grocery_list_items")
      .update(update)
      .eq("id", body.item_id)
      .eq("user_id", userId)
      .select()
      .maybeSingle();
    if (upErr) throw upErr;

    return json({ ok: true, action: body.action, item: updated });
  } catch (err) {
    try { captureEdgeError(err, { fn: "grocery-list-item-update", user_id: userId, extra: { action: body?.action } }); } catch { /* */ }
    return json({ error: (err as Error).message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
