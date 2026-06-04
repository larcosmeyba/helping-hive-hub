// Marks a generated recipe as cooked: decrements pantry quantities for
// ingredients flagged already_have, marks fully-used items checked_off,
// and stamps the recipe with cooked_at + savings.

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

    const { recipe_id } = await req.json().catch(() => ({}));
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

    await admin
      .from("generated_recipes")
      .update({ status: "cooked", cooked_at: new Date().toISOString() })
      .eq("id", recipe_id)
      .eq("user_id", userId);

    return new Response(
      JSON.stringify({ ok: true, depleted, savings_estimate: recipe.savings_estimate }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("mark-recipe-cooked error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
