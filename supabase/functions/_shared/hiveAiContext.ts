// Builds the hive_ai_context object consumed by mock AI now and OpenAI later.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function buildHiveAiContext(supabase: ReturnType<typeof createClient>, userId: string) {
  const [{ data: profile }, { data: pantry }, { data: alerts }, { data: grocery }] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("pantry_items").select("*").eq("user_id", userId),
    supabase.from("food_waste_alerts").select("*").eq("user_id", userId).eq("resolved", false),
    supabase.from("grocery_list_items").select("*").eq("user_id", userId),
  ]);

  const items = pantry ?? [];
  return {
    user_id: userId,
    household_size: profile?.household_size ?? 1,
    weekly_grocery_budget: profile?.weekly_budget ?? 75,
    preferred_store: profile?.home_store ?? null,
    preferred_store_id: profile?.preferred_store_id ?? null,
    dietary_preferences: profile?.dietary_preferences ?? [],
    allergies: profile?.allergies ?? [],
    cooking_confidence: profile?.cooking_confidence ?? null,
    pantry_items: items.filter((i: any) => (i.location ?? "pantry") === "pantry"),
    fridge_items: items.filter((i: any) => i.location === "fridge"),
    freezer_items: items.filter((i: any) => i.location === "freezer"),
    expiration_dates: items.map((i: any) => ({ id: i.id, name: i.item_name, expiration_date: i.expiration_date })),
    freshness_statuses: items.map((i: any) => ({ id: i.id, status: i.freshness_status })),
    food_waste_alerts: alerts ?? [],
    low_stock_items: items.filter((i: any) => i.is_low_stock),
    disliked_foods: [],
    grocery_list_items: grocery ?? [],
  };
}
