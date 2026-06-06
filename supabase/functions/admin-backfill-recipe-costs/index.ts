// Admin-only: estimate recipe cost for recipes missing estimated_recipe_cost.
// Batches 20 recipes per OpenAI call (gpt-5.4-mini). Returns counts processed.
// Trigger recipes_compute_cost_fields_trg derives cost_per_serving + budget_tier.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const BATCH_SIZE = 20;
const MAX_BATCHES = 20; // safety cap

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Auth: must be admin
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "unauthorized" }, 401);
  const { data: adminRow } = await admin.rpc("is_admin", { _user_id: user.id });
  if (!adminRow) return json({ error: "forbidden" }, 403);

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return json({ error: "OPENAI_API_KEY missing" }, 500);

  let totalProcessed = 0;
  let totalUpdated = 0;
  const errors: string[] = [];

  for (let i = 0; i < MAX_BATCHES; i++) {
    const { data: recipes, error } = await admin
      .from("recipes")
      .select("id, title, ingredients, serving_size")
      .or("estimated_recipe_cost.is.null,estimated_recipe_cost.eq.0")
      .limit(BATCH_SIZE);
    if (error) return json({ error: error.message }, 500);
    if (!recipes || recipes.length === 0) break;

    const payload = recipes.map((r) => ({
      id: r.id,
      title: r.title,
      servings: r.serving_size,
      ingredients: r.ingredients,
    }));

    const sys = "You are a US grocery pricing analyst. Estimate the TOTAL grocery cost (USD) to make each recipe at typical US supermarket prices. Reply ONLY with strict JSON: {\"costs\":[{\"id\":\"<uuid>\",\"estimated_recipe_cost\":<number>}]}. No prose.";
    const usr = `Estimate cost for these ${recipes.length} recipes:\n${JSON.stringify(payload)}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
        messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
        response_format: { type: "json_object" },
        max_completion_tokens: 4000,
      }),
    });
    if (!res.ok) {
      errors.push(`batch ${i}: ${res.status} ${await res.text()}`);
      break;
    }
    const j = await res.json();
    const txt = j?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { costs?: Array<{ id: string; estimated_recipe_cost: number }> };
    try { parsed = JSON.parse(txt); } catch { errors.push(`batch ${i}: bad json`); continue; }

    const updates = parsed.costs ?? [];
    for (const u of updates) {
      const n = Number(u.estimated_recipe_cost);
      if (!u.id || !isFinite(n) || n <= 0) continue;
      const { error: upErr } = await admin
        .from("recipes")
        .update({ estimated_recipe_cost: Math.round(n * 100) / 100 })
        .eq("id", u.id);
      if (upErr) errors.push(`update ${u.id}: ${upErr.message}`);
      else totalUpdated++;
    }
    totalProcessed += recipes.length;

    if (recipes.length < BATCH_SIZE) break;
  }

  return json({ ok: true, processed: totalProcessed, updated: totalUpdated, errors });
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
