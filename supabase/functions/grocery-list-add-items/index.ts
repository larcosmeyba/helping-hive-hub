// Adds items to the user's active grocery list from any feature source
// (meal_plan, fridge_chef, food_waste, pantry_low_stock, manual, bulk_buying).
// Skips items already in pantry (unless low_stock) and merges duplicates.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type SourceType =
  | "meal_plan"
  | "fridge_chef"
  | "food_waste"
  | "pantry_low_stock"
  | "manual"
  | "bulk_buying";

interface IncomingItem {
  item_name: string;
  quantity?: string | number;
  unit?: string;
  category?: string;
  estimated_price?: number;
  instacart_search_term?: string;
  needed_for_meals?: string[];
  source_ref_id?: string;
}

const ALLOWED_SOURCES: SourceType[] = [
  "meal_plan",
  "fridge_chef",
  "food_waste",
  "pantry_low_stock",
  "manual",
  "bulk_buying",
];

function norm(s: string) {
  return (s || "").trim().toLowerCase();
}

function parseQty(q: unknown): number | null {
  if (q == null) return null;
  const m = String(q).match(/[\d.]+/);
  return m ? Number(m[0]) : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const source_type = (body?.source_type ?? "manual") as SourceType;
    const items: IncomingItem[] = Array.isArray(body?.items) ? body.items : [];

    if (!ALLOWED_SOURCES.includes(source_type)) {
      return new Response(JSON.stringify({ error: "Invalid source_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!items.length) {
      return new Response(JSON.stringify({ error: "No items provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Find or create the user's active grocery list
    const { data: existingList } = await admin
      .from("grocery_lists")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let listId: string;
    if (existingList) {
      listId = existingList.id;
    } else {
      const { data: newList, error: newListErr } = await admin
        .from("grocery_lists")
        .insert({ user_id: userId, status: "active" })
        .select()
        .single();
      if (newListErr) throw newListErr;
      listId = newList.id;
    }

    // 2. Fetch pantry items (skip-list) and existing list items (merge target)
    const [{ data: pantry }, { data: existingItems }] = await Promise.all([
      admin.from("pantry_items").select("item_name, is_low_stock").eq("user_id", userId),
      admin
        .from("grocery_list_items")
        .select("id, ingredient_name, quantity")
        .eq("user_id", userId)
        .eq("grocery_list_id", listId),
    ]);

    const pantrySkip = new Set(
      (pantry ?? [])
        .filter((p: any) => !p.is_low_stock)
        .map((p: any) => norm(p.item_name)),
    );
    const existingByName = new Map<string, { id: string; quantity: string | null }>();
    for (const it of existingItems ?? []) {
      existingByName.set(norm(it.ingredient_name), {
        id: it.id as string,
        quantity: (it.quantity as string) ?? null,
      });
    }

    const toInsert: any[] = [];
    const toUpdate: { id: string; quantity: string }[] = [];
    const skipped: string[] = [];

    for (const raw of items) {
      const name = (raw.item_name ?? "").trim();
      if (!name) continue;
      const key = norm(name);

      // Pantry skip — unless this *is* a low-stock add
      if (pantrySkip.has(key) && source_type !== "pantry_low_stock") {
        skipped.push(name);
        continue;
      }

      const incomingQtyStr = raw.quantity != null ? String(raw.quantity) : "";

      // Merge into existing line if present
      const existing = existingByName.get(key);
      if (existing) {
        const a = parseQty(existing.quantity);
        const b = parseQty(incomingQtyStr);
        if (a != null && b != null) {
          // Preserve original unit text after the number
          const unitPart = (existing.quantity ?? "").replace(/[\d.\s]+/, "").trim();
          toUpdate.push({ id: existing.id, quantity: `${a + b}${unitPart ? " " + unitPart : ""}` });
        }
        continue;
      }

      toInsert.push({
        user_id: userId,
        grocery_list_id: listId,
        ingredient_name: name,
        quantity: incomingQtyStr,
        unit: raw.unit ?? null,
        category: raw.category ?? null,
        store_section: raw.category ?? null,
        estimated_price: raw.estimated_price ?? null,
        instacart_search_term: raw.instacart_search_term ?? name,
        needed_for_meals: raw.needed_for_meals ?? [],
        source_type,
        source_ref_id: raw.source_ref_id ?? null,
        selected_for_instacart: true,
        already_have: false,
      });
    }

    if (toInsert.length) {
      const { error: insErr } = await admin.from("grocery_list_items").insert(toInsert);
      if (insErr) throw insErr;
    }
    for (const upd of toUpdate) {
      await admin
        .from("grocery_list_items")
        .update({ quantity: upd.quantity })
        .eq("id", upd.id)
        .eq("user_id", userId);
    }

    // Refresh total
    const { data: refreshed } = await admin
      .from("grocery_list_items")
      .select("estimated_price")
      .eq("grocery_list_id", listId);
    const total = (refreshed ?? []).reduce(
      (s: number, i: any) => s + (Number(i.estimated_price) || 0),
      0,
    );
    await admin
      .from("grocery_lists")
      .update({ estimated_total: total, updated_at: new Date().toISOString() })
      .eq("id", listId);

    return new Response(
      JSON.stringify({
        grocery_list_id: listId,
        added: toInsert.length,
        merged: toUpdate.length,
        skipped,
        estimated_total: total,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("grocery-list-add-items error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
