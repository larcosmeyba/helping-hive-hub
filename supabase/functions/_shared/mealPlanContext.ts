// Builds a single object containing everything we need to send to OpenAI
// (or the current mock engine) to generate or swap a meal plan.
//
// Shape is intentionally stable: future OpenAI integration consumes this
// without further refactoring of the Meal Plan tab.

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface MealPlanContext {
  user_id: string;
  household_size: number | null;
  weekly_grocery_budget: number | null;
  preferred_store: string | null;
  preferred_store_id: string | null;
  zip_code: string | null;
  dietary_preferences: string[];
  allergies: string[];
  cooking_confidence: string | null;
  pantry_items: Array<Record<string, unknown>>;
  fridge_items: Array<Record<string, unknown>>;
  freezer_items: Array<Record<string, unknown>>;
  expiring_soon_items: Array<Record<string, unknown>>;
  low_stock_items: Array<Record<string, unknown>>;
  disliked_foods: string[];
  completed_meals: Array<Record<string, unknown>>;
  grocery_status: string;
  purchased_grocery_lists: Array<Record<string, unknown>>;
}

export async function buildMealPlanContext(
  admin: SupabaseClient,
  userId: string,
): Promise<MealPlanContext> {
  const [profileRes, homeStoreRes, pantryRes, activePlanRes, purchasedListsRes] =
    await Promise.all([
      admin.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      admin.from("instacart_home_store").select("*").eq("user_id", userId).maybeSingle(),
      admin.from("pantry_items").select("*").eq("user_id", userId),
      admin
        .from("meal_plans")
        .select("id, grocery_status, plan_data")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("grocery_lists")
        .select("id, status, updated_at")
        .eq("user_id", userId)
        .eq("status", "purchased")
        .order("updated_at", { ascending: false })
        .limit(5),
    ]);

  const profile = (profileRes.data ?? {}) as Record<string, unknown>;
  const home = (homeStoreRes.data ?? {}) as Record<string, unknown>;
  const pantry = (pantryRes.data ?? []) as Array<Record<string, unknown>>;

  const byLocation = (loc: string) =>
    pantry.filter((p) => (p.location ?? "pantry") === loc);

  const today = new Date();
  const threeDays = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);

  const expiringSoon = pantry.filter((p) => {
    const exp = p.expiration_date ? new Date(String(p.expiration_date)) : null;
    return exp && exp <= threeDays;
  });
  const lowStock = pantry.filter((p) => p.is_low_stock === true);

  let completedMeals: Array<Record<string, unknown>> = [];
  if (activePlanRes.data?.id) {
    const { data: cooked } = await admin
      .from("meal_plan_meals")
      .select("id, meal_name, meal_type, cooked_at")
      .eq("user_id", userId)
      .eq("meal_plan_id", activePlanRes.data.id)
      .eq("marked_cooked", true);
    completedMeals = cooked ?? [];
  }

  return {
    user_id: userId,
    household_size: (profile.household_size as number) ?? null,
    weekly_grocery_budget: (profile.weekly_grocery_budget as number) ?? null,
    preferred_store: (home.retailer_name as string) ?? (profile.preferred_store as string) ?? null,
    preferred_store_id: (home.retailer_key as string) ?? null,
    zip_code: (home.postal_code as string) ?? (profile.zip_code as string) ?? null,
    dietary_preferences: ((profile.dietary_preferences as string[]) ?? []) || [],
    allergies: ((profile.allergies as string[]) ?? []) || [],
    cooking_confidence: (profile.cooking_confidence as string) ?? null,
    pantry_items: byLocation("pantry"),
    fridge_items: byLocation("fridge"),
    freezer_items: byLocation("freezer"),
    expiring_soon_items: expiringSoon,
    low_stock_items: lowStock,
    disliked_foods: ((profile.disliked_foods as string[]) ?? []) || [],
    completed_meals: completedMeals,
    grocery_status: (activePlanRes.data?.grocery_status as string) ?? "not_generated",
    purchased_grocery_lists: purchasedListsRes.data ?? [],
  };
}

export function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export async function getUserIdFromAuth(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await userClient.auth.getClaims(token);
  if (error || !data?.claims) return null;
  return data.claims.sub as string;
}
