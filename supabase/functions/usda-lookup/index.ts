// USDA FoodData Central lookup: search by ingredient name, return normalized
// nutrition (per 100g basis). Used by admins to populate the ingredients table
// and by the meal engine to verify macros.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const USDA_BASE = "https://api.nal.usda.gov/fdc/v1";

interface UsdaNutrient {
  nutrientId: number;
  nutrientName: string;
  value: number;
  unitName: string;
}

interface UsdaFood {
  fdcId: number;
  description: string;
  foodCategory?: string;
  brandOwner?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients: UsdaNutrient[];
}

// Standard USDA nutrient IDs
const N_CALORIES = 1008;
const N_PROTEIN = 1003;
const N_FAT = 1004;
const N_CARBS = 1005;
const N_FIBER = 1079;

function pickNutrient(nutrients: UsdaNutrient[], id: number): number | null {
  const n = nutrients.find((x) => x.nutrientId === id);
  return n ? Number(n.value) : null;
}

function normalize(food: UsdaFood) {
  const n = food.foodNutrients ?? [];
  return {
    usda_food_id: String(food.fdcId),
    usda_description: food.description,
    category: food.foodCategory ?? null,
    serving_size:
      food.servingSize && food.servingSizeUnit
        ? `${food.servingSize} ${food.servingSizeUnit}`
        : "100 g",
    serving_size_grams: food.servingSize ?? 100,
    calories: pickNutrient(n, N_CALORIES),
    protein_g: pickNutrient(n, N_PROTEIN),
    carbs_g: pickNutrient(n, N_CARBS),
    fat_g: pickNutrient(n, N_FAT),
    fiber_g: pickNutrient(n, N_FIBER),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const USDA_API_KEY = Deno.env.get("USDA_API_KEY");
    if (!USDA_API_KEY) return json({ error: "USDA_API_KEY not configured" }, 500);

    const { action, query, fdcId, limit = 10, save = false } = await req.json();

    // Auth-gate any write path (save=true) to admins only. Read-only search/get
    // remains open so the meal engine and admins can verify nutrition without auth.
    const isWrite = action === "get" && save === true;
    if (isWrite) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userErr } = await userClient.auth.getUser(token);
      if (userErr || !userData?.user?.id) return json({ error: "Unauthorized" }, 401);

      const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
      const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: userData.user.id });
      if (!isAdmin) return json({ error: "Forbidden — admin role required for write" }, 403);
    }

    if (action === "search") {
      if (!query) return json({ error: "query required" }, 400);
      const url = `${USDA_BASE}/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(query)}&pageSize=${limit}&dataType=Foundation,SR%20Legacy,Survey%20%28FNDDS%29`;
      const r = await fetch(url);
      if (!r.ok) return json({ error: `USDA search failed: ${r.status}` }, 502);
      const data = await r.json();
      const foods = (data.foods ?? []).map((f: UsdaFood) => normalize(f));
      return json({ results: foods });
    }

    if (action === "get") {
      if (!fdcId) return json({ error: "fdcId required" }, 400);
      const url = `${USDA_BASE}/food/${fdcId}?api_key=${USDA_API_KEY}`;
      const r = await fetch(url);
      if (!r.ok) return json({ error: `USDA get failed: ${r.status}` }, 502);
      const food = (await r.json()) as UsdaFood;
      const normalized = normalize(food);

      if (save) {
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
        const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
        const { error } = await admin
          .from("ingredients")
          .upsert(
            {
              ingredient_name: normalized.usda_description,
              ...normalized,
            },
            { onConflict: "usda_food_id" }
          );
        if (error) return json({ error: error.message }, 500);
      }

      return json({ food: normalized });
    }

    return json({ error: "Unknown action. Use 'search' or 'get'." }, 400);
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
