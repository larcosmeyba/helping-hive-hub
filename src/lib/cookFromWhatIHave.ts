// Client wrappers for the Cook From What I Have feature.
// - generateRecipesFromInventory: calls the cook-from-what-i-have edge function.
// - markRecipeCooked: calls the mark-recipe-cooked edge function.
// - sendMissingIngredientsToGroceryList: pipes "grocery_needed" ingredients into
//   the existing unified grocery list (which feeds the APPROVED Instacart flow).
//
// The Instacart flow itself is untouched — items just land in grocery_list_items
// where the existing ShopGroceriesButton picks them up.

import { supabase } from "@/integrations/supabase/client";
import { addItemsToGroceryList, type AddItemsResult } from "@/lib/groceryList";

export interface GeneratedRecipeIngredient {
  id?: string;
  recipe_id?: string;
  item_name: string;
  quantity?: string | null;
  unit?: string | null;
  already_have: boolean;
  source_location?: "pantry" | "fridge" | "freezer" | "grocery_needed" | null;
  pantry_item_id?: string | null;
  estimated_price?: number | null;
  instacart_search_term?: string | null;
}

export interface GeneratedRecipe {
  id: string;
  user_id: string;
  source_type: "cook_from_what_i_have" | "food_waste" | "meal_plan";
  recipe_name: string;
  description: string | null;
  servings: number | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  difficulty: string | null;
  estimated_cost_of_missing_items: number | null;
  savings_estimate: number | null;
  food_waste_reason: string | null;
  instructions: string[];
  status: "suggested" | "saved" | "cooked";
  cooked_at: string | null;
  created_at: string;
  ingredients?: GeneratedRecipeIngredient[];
}

export interface CookTierItem {
  public_recipe_id: string;
  recipe_name: string;
  description: string | null;
  image_url: string | null;
  instructions: string[];
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  pantry_match_pct: number;
  missing_items: Array<{ item_name: string; estimated_price: number }>;
  missing_count: number;
  cost_to_complete: number;
  uses_expiring: number;
  tier: "make_now" | "need_1" | "need_2_3";
  why: string | null;
  substitutions: string[];
  expiring_used: string[];
}

export interface CookFromInventoryResponse {
  source: "db_match" | "ai_fallback" | "generative";
  tiers?: { make_now: CookTierItem[]; need_1: CookTierItem[]; need_2_3: CookTierItem[] };
  tier_counts?: { make_now: number; need_1: number; need_2_3: number };
  recipes?: GeneratedRecipe[];
}

export async function generateRecipesFromInventory(opts?: {
  source_type?: "cook_from_what_i_have" | "food_waste";
  count?: number;
  new_algorithm?: boolean;
}): Promise<GeneratedRecipe[]> {
  const { data, error } = await supabase.functions.invoke("cook-from-what-i-have", {
    body: {
      source_type: opts?.source_type ?? "cook_from_what_i_have",
      count: opts?.count ?? 3,
      new_algorithm: !!opts?.new_algorithm,
    },
  });
  if (error) throw error;
  return (data?.recipes ?? []) as GeneratedRecipe[];
}

export async function cookFromInventoryV2(opts?: {
  source_type?: "cook_from_what_i_have" | "food_waste";
  count?: number;
}): Promise<CookFromInventoryResponse> {
  const { data, error } = await supabase.functions.invoke("cook-from-what-i-have", {
    body: {
      source_type: opts?.source_type ?? "cook_from_what_i_have",
      count: opts?.count ?? 5,
      new_algorithm: true,
    },
  });
  if (error) throw error;
  return (data ?? { source: "generative" }) as CookFromInventoryResponse;
}

export async function markRecipeCooked(recipe_id: string) {
  const { data, error } = await supabase.functions.invoke("mark-recipe-cooked", {
    body: { recipe_id },
  });
  if (error) throw error;
  return data as { ok: boolean; depleted: number; savings_estimate: number | null };
}

export async function addSingleIngredientToGroceryList(
  ingredient: GeneratedRecipeIngredient,
  source: "cook_from_what_i_have" | "food_waste" | "fridge_chef" = "cook_from_what_i_have",
  source_ref_id?: string,
): Promise<AddItemsResult> {
  return addItemsToGroceryList(source, [
    {
      item_name: ingredient.item_name,
      quantity: ingredient.quantity ?? undefined,
      unit: ingredient.unit ?? undefined,
      estimated_price: ingredient.estimated_price ?? undefined,
      instacart_search_term: ingredient.instacart_search_term ?? ingredient.item_name,
      source_ref_id,
    },
  ]);
}

export async function sendMissingIngredientsToGroceryList(
  recipe: GeneratedRecipe,
): Promise<AddItemsResult> {
  const missing = (recipe.ingredients ?? []).filter(
    (i) => !i.already_have || i.source_location === "grocery_needed",
  );
  if (!missing.length) {
    return { grocery_list_id: "", added: 0, merged: 0, skipped: [], estimated_total: 0 };
  }
  return addItemsToGroceryList(
    recipe.source_type === "food_waste" ? "food_waste" : "cook_from_what_i_have",
    missing.map((i) => ({
      item_name: i.item_name,
      quantity: i.quantity ?? undefined,
      unit: i.unit ?? undefined,
      estimated_price: i.estimated_price ?? undefined,
      instacart_search_term: i.instacart_search_term ?? i.item_name,
      source_ref_id: recipe.id,
    })),
  );
}
