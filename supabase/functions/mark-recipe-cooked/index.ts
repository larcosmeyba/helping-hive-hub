// Marks a generated recipe as cooked: decrements pantry quantities for
// ingredients flagged already_have, marks fully-used items checked_off,
// writes recipe_usage history (when a public recipe_id is supplied),
// and stamps the recipe with cooked_at + savings. Supports a "favorited"
// preference toggle for cook recipes.

import { captureEdgeError } from "../_shared/sentry.ts";

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

function parseNum(q: unknown): number | null {
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
    const { recipe_id } = body;
    const public_recipe_id: string | null = body?.public_recipe_id ?? null;
    const favorited: boolean | null = typeof body?.favorited === "boolean" ? body.favorited : null;
    if (!recipe_id) {
      return new Response(JSON.stringify({ error: "recipe_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: recipe } = await admin
      .from("generated_recipes")
      .select("*")
      .eq("id", recipe_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!recipe) {
      return new Response(JSON.stringify({ error: "Recipe not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: ings } = await admin
      .from("generated_recipe_ingredients")
      .select("*")
      .eq("recipe_id", recipe_id)
      .eq("user_id", userId);

    let depleted = 0;
    for (const ing of ings ?? []) {
      if (!ing.already_have || !ing.pantry_item_id) continue;
      const { data: pItem } = await admin
        .from("pantry_items")
        .select("id, quantity")
        .eq("id", ing.pantry_item_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (!pItem) continue;

      const have = parseNum(pItem.quantity) ?? 0;
      const use = parseNum(ing.quantity) ?? 0;
      const remaining = Math.max(0, have - use);

      if (remaining <= 0) {
        await admin
          .from("pantry_items")
          .update({
            quantity: "0",
            is_out_of_stock: true,
            freshness_status: "checked_off",
            updated_at: new Date().toISOString(),
          })
          .eq("id", pItem.id);
        depleted += 1;
      } else {
        const unitPart = String(pItem.quantity ?? "").replace(/[\d.\s]+/, "").trim();
        await admin
          .from("pantry_items")
          .update({
            quantity: `${remaining}${unitPart ? " " + unitPart : ""}`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", pItem.id);
      }
    }

    // Resolve food waste alerts tied to consumed pantry items.
    const consumedPantryIds = (ings ?? [])
      .filter((i: any) => i.already_have && i.pantry_item_id)
      .map((i: any) => i.pantry_item_id);
    if (consumedPantryIds.length > 0) {
      await admin
        .from("food_waste_alerts")
        .update({ resolved: true })
        .eq("user_id", userId)
        .in("pantry_item_id", consumedPantryIds);
    }

    await admin
      .from("generated_recipes")
      .update({ status: "cooked", cooked_at: new Date().toISOString() })
      .eq("id", recipe_id)
      .eq("user_id", userId);

    // Recipe usage history — only when the cooked recipe is a real
    // public recipes.id (e.g. a DB-matched Cook What I Have suggestion).
    if (public_recipe_id) {
      try {
        const today = new Date();
        const dow = today.getUTCDay(); // 0 = Sun
        const monday = new Date(today);
        monday.setUTCDate(today.getUTCDate() - ((dow + 6) % 7));
        const weekStart = monday.toISOString().slice(0, 10);
        await admin.from("recipe_usage").insert({
          user_id: userId,
          recipe_id: public_recipe_id,
          week_start: weekStart,
          cooked_at: new Date().toISOString(),
          favorited: favorited ?? false,
        });
      } catch (err) {
        console.warn("[mark-recipe-cooked] recipe_usage insert failed", err);
      }
    }

    const money_saved = Number(recipe.savings_estimate ?? 0);
    const food_waste_prevented = depleted;
    return new Response(
      JSON.stringify({
        ok: true,
        depleted,
        savings_estimate: recipe.savings_estimate,
        money_saved,
        food_waste_prevented,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    try { captureEdgeError(err, { fn: "mark-recipe-cooked" }); } catch { /* */ }
    console.error("mark-recipe-cooked error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
