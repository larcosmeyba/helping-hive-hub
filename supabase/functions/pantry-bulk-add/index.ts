// pantry-bulk-add: insert a batch of just-purchased grocery items into
// the user's pantry with default expiration estimates per category +
// storage location. RLS-scoped via user_id from JWT. Sentry-captured.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { adminClient, getUserIdFromAuth } from "../_shared/mealPlanContext.ts";
import { captureEdgeError } from "../_shared/sentry.ts";
import { calcFreshness, normalize } from "../_shared/pantry.ts";

interface BulkItem {
  item_name: string;
  quantity?: string | number;
  unit?: string | null;
  category?: string | null;
  location?: "pantry" | "fridge" | "freezer";
}

const ALLOWED_LOCATION = new Set(["pantry", "fridge", "freezer"]);

// Default shelf-life (days) per coarse category.
const DEFAULT_DAYS: Record<string, number> = {
  produce: 7, fruits: 7, vegetables: 7,
  dairy: 14, "dairy & eggs": 14,
  protein: 4, "meat & protein": 4, meat: 4,
  frozen: 90,
  bakery: 5, "grains & bread": 7, grains: 180,
  pantry: 180, "canned & pantry": 365, pantry_staples: 365,
  snacks: 60, beverages: 60,
  household: 365, other: 14,
};

function inferLocation(category?: string | null): "pantry" | "fridge" | "freezer" {
  const c = (category ?? "").toLowerCase();
  if (c.includes("frozen")) return "freezer";
  if (/(dairy|egg|meat|protein|produce|fruit|veget)/.test(c)) return "fridge";
  return "pantry";
}

function inferExpiration(category?: string | null): string {
  const c = (category ?? "").toLowerCase();
  const days = DEFAULT_DAYS[c] ?? 14;
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const userId = await getUserIdFromAuth(req);
  if (!userId) return json({ error: "Unauthorized" }, 401);

  let body: { items: BulkItem[] };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const items = Array.isArray(body?.items) ? body.items : [];
  if (!items.length) return json({ error: "items[] required" }, 400);
  const MAX_ITEMS = 100;
  if (items.length > MAX_ITEMS) {
    return json({ error: `Too many items: max ${MAX_ITEMS} per call` }, 413);
  }

  try {
    const rows = items
      .map((i) => {
        const loc = (i.location && ALLOWED_LOCATION.has(i.location))
          ? i.location
          : inferLocation(i.category);
        const expiration = inferExpiration(i.category);
        const name = String(i.item_name ?? "").slice(0, 200).trim();
        if (!name) return null;
        return {
          user_id: userId,
          item_name: name,
          normalized_item_name: normalize(name),
          quantity: i.quantity != null ? String(i.quantity) : null,
          unit: i.unit ?? null,
          category: i.category ?? "other",
          location: loc,
          expiration_date: expiration,
          is_low_stock: false,
          freshness_status: calcFreshness(expiration, false),
          manually_added: false,
          photo_detected: false,
        };
      })
      .filter(Boolean) as Array<Record<string, unknown>>;

    if (!rows.length) return json({ ok: true, added: 0, items: [] });

    const admin = adminClient();
    const { data, error } = await admin.from("pantry_items").insert(rows).select();
    if (error) throw error;
    return json({ ok: true, added: data?.length ?? 0, items: data ?? [] });
  } catch (err) {
    try { captureEdgeError(err, { fn: "pantry-bulk-add", user_id: userId, extra: { count: items.length } }); } catch { /* */ }
    return json({ error: (err as Error).message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
