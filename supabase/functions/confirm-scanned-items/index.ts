// Confirms a user's selection from a scan and writes the items into pantry_items.
// Rejected items are marked rejected=true and NOT saved to pantry.
// Returns the user's updated pantry inventory.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";
import { calcFreshness, normalize } from "../_shared/pantry.ts";

const ALLOWED_LOCATION = new Set(["pantry", "fridge", "freezer"]);

Deno.serve(async (req) => {
  const pf = handlePreflight(req); if (pf) return pf;
  const cors = buildCorsHeaders(req);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401, cors);

    const body = await req.json().catch(() => ({}));
    const photoId: string | undefined = body.inventory_photo_id;
    const items: any[] = Array.isArray(body.items) ? body.items : [];
    if (!items.length) return json({ error: "items required" }, 400, cors);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const confirmed = items.filter((i) => i.confirmed !== false && !i.rejected);
    const rejected = items.filter((i) => i.rejected === true);

    // Save confirmed items into pantry_items
    const pantryRows = confirmed.map((i) => {
      const loc = ALLOWED_LOCATION.has(i.location) ? i.location : "pantry";
      return {
        user_id: user.id,
        item_name: String(i.item_name ?? "").slice(0, 200),
        normalized_item_name: normalize(String(i.item_name ?? "")),
        quantity: i.quantity != null ? String(i.quantity) : null,
        unit: i.unit ?? null,
        category: i.category ?? "other",
        location: loc,
        expiration_date: i.expiration_date ?? null,
        is_low_stock: !!i.low_stock,
        freshness_status: calcFreshness(i.expiration_date ?? null, !!i.low_stock),
        manually_added: false,
        photo_detected: true,
      };
    }).filter((r) => r.item_name.length > 0);

    let added: any[] = [];
    if (pantryRows.length) {
      const { data, error } = await admin
        .from("pantry_items")
        .insert(pantryRows)
        .select();
      if (error) throw error;
      added = data ?? [];
    }

    // Mark scanned items confirmed/rejected (scoped to user)
    const confirmIds = confirmed.map((i) => i.id).filter(Boolean);
    const rejectIds = rejected.map((i) => i.id).filter(Boolean);

    if (confirmIds.length) {
      await admin
        .from("scanned_inventory_items")
        .update({ confirmed: true, rejected: false })
        .in("id", confirmIds)
        .eq("user_id", user.id);
    }
    if (rejectIds.length) {
      await admin
        .from("scanned_inventory_items")
        .update({ rejected: true, confirmed: false })
        .in("id", rejectIds)
        .eq("user_id", user.id);
    }

    // Return updated pantry inventory
    const { data: inventory } = await admin
      .from("pantry_items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    return json({
      ok: true,
      added_count: added.length,
      added,
      photo_id: photoId ?? null,
      inventory: inventory ?? [],
    }, 200, cors);
  } catch (err: any) {
    console.error("confirm-scanned-items error", err);
    return json({ error: err?.message ?? String(err) }, 500, cors);
  }
});

function json(payload: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
