// One-shot Phase D migration: parses recipes.ingredients JSONB strings into
// normalized recipe_ingredients rows linked to the ingredients table.
// Admin-only. Idempotent — safe to re-run.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Common unit tokens (singular form after stripping trailing 's')
const UNIT_TOKENS = new Set([
  "cup", "tbsp", "tablespoon", "tsp", "teaspoon", "oz", "ounce", "lb", "pound",
  "g", "gram", "kg", "ml", "l", "liter", "clove", "can", "package", "packet",
  "slice", "piece", "pinch", "dash", "stick", "head", "bunch", "jar", "bottle",
]);

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, half: 0.5, quarter: 0.25,
};

function parseQuantity(token: string): number | null {
  if (!token) return null;
  const lower = token.toLowerCase();
  if (NUMBER_WORDS[lower] != null) return NUMBER_WORDS[lower];
  // mixed fraction: "1 1/2" handled by caller; here handle "1/2" or "1.5" or "2"
  if (/^\d+\/\d+$/.test(token)) {
    const [a, b] = token.split("/").map(Number);
    return b ? a / b : null;
  }
  const n = Number(token);
  return Number.isFinite(n) ? n : null;
}

interface Parsed {
  quantity: number | null;
  unit: string | null;
  name: string;
  display_text: string;
}

function parseIngredientLine(raw: string): Parsed {
  const display_text = raw.trim();
  const tokens = display_text.split(/\s+/);
  let i = 0;
  let quantity: number | null = null;

  // Handle "1 1/2" mixed fraction
  if (tokens.length >= 2 && /^\d+$/.test(tokens[0]) && /^\d+\/\d+$/.test(tokens[1])) {
    quantity = Number(tokens[0]) + (parseQuantity(tokens[1]) ?? 0);
    i = 2;
  } else {
    const q = parseQuantity(tokens[0]);
    if (q != null) { quantity = q; i = 1; }
  }

  let unit: string | null = null;
  if (tokens[i]) {
    const candidate = tokens[i].toLowerCase().replace(/[.,]/g, "");
    const singular = candidate.endsWith("s") ? candidate.slice(0, -1) : candidate;
    if (UNIT_TOKENS.has(singular)) {
      unit = singular;
      i++;
    }
  }

  // Remaining = name (strip trailing prep notes after comma)
  const name = tokens.slice(i).join(" ").split(",")[0].trim();
  return { quantity, unit, name, display_text };
}

// Fuzzy match against ingredient names (lowercased, contains either way)
function matchIngredient(parsedName: string, ingredients: { id: string; name: string }[]) {
  if (!parsedName) return null;
  const target = parsedName.toLowerCase();
  // Exact
  let hit = ingredients.find(i => i.name === target);
  if (hit) return hit;
  // Contains
  hit = ingredients.find(i => target.includes(i.name) || i.name.includes(target));
  if (hit) return hit;
  // Word overlap (any significant word)
  const words = target.split(/\s+/).filter(w => w.length > 3);
  for (const w of words) {
    hit = ingredients.find(i => i.name.includes(w));
    if (hit) return hit;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Auth: require admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) return json({ error: "Forbidden — admin only" }, 403);

    const { dryRun = false } = await req.json().catch(() => ({}));

    // Load all ingredients once
    const { data: ingRows, error: ingErr } = await admin
      .from("ingredients")
      .select("ingredient_id, ingredient_name");
    if (ingErr) throw ingErr;
    const ingredients = (ingRows ?? []).map(r => ({
      id: r.ingredient_id,
      name: r.ingredient_name.toLowerCase(),
    }));

    // Load all recipes
    const { data: recipes, error: recErr } = await admin
      .from("recipes")
      .select("id, title, ingredients");
    if (recErr) throw recErr;

    let totalLines = 0;
    let matched = 0;
    let unmatched: { recipe: string; line: string }[] = [];
    const rowsToInsert: any[] = [];

    for (const recipe of recipes ?? []) {
      const lines = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
      for (let idx = 0; idx < lines.length; idx++) {
        const raw = String(lines[idx] ?? "").trim();
        if (!raw) continue;
        totalLines++;
        const parsed = parseIngredientLine(raw);
        const ing = matchIngredient(parsed.name, ingredients);
        if (!ing) {
          unmatched.push({ recipe: recipe.title, line: raw });
          continue;
        }
        matched++;
        rowsToInsert.push({
          recipe_id: recipe.id,
          ingredient_id: ing.id,
          quantity: parsed.quantity,
          unit: parsed.unit,
          display_text: parsed.display_text,
          sort_order: idx,
        });
      }
    }

    if (dryRun) {
      return json({
        dryRun: true,
        recipes: recipes?.length ?? 0,
        totalLines,
        matched,
        unmatchedCount: unmatched.length,
        unmatchedSample: unmatched.slice(0, 20),
      });
    }

    // Wipe existing rows for these recipes (idempotent re-run)
    const recipeIds = (recipes ?? []).map(r => r.id);
    if (recipeIds.length) {
      const { error: delErr } = await admin
        .from("recipe_ingredients")
        .delete()
        .in("recipe_id", recipeIds);
      if (delErr) throw delErr;
    }

    // Insert in chunks
    const CHUNK = 200;
    for (let i = 0; i < rowsToInsert.length; i += CHUNK) {
      const chunk = rowsToInsert.slice(i, i + CHUNK);
      const { error: insErr } = await admin.from("recipe_ingredients").insert(chunk);
      if (insErr) throw insErr;
    }

    return json({
      success: true,
      recipes: recipes?.length ?? 0,
      totalLines,
      matched,
      inserted: rowsToInsert.length,
      unmatchedCount: unmatched.length,
      unmatchedSample: unmatched.slice(0, 20),
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
