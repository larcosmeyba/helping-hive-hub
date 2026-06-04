// Client wrappers for the Cook From What I Have feature.
// - generateRecipesFromInventory: calls the cook-from-what-i-have edge function.
// - markRecipeCooked: calls the mark-recipe-cooked edge function.
// - sendMissingIngredientsToGroceryList: pipes "grocery_needed" ingredients into
//   the existing unified grocery list (which feeds the APPROVED Instacart flow).
//
// The Instacart flow itself is untouched — items just land in grocery_list_items
// where the existing SendToInstacartButton picks them up.

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

export async function generateRecipesFromInventory(opts?: {
  source_type?: "cook_from_what_i_have" | "food_waste";
  count?: number;
}): Promise<GeneratedRecipe[]> {
  const { data, error } = await supabase.functions.invoke("cook-from-what-i-have", {
    body: {
      source_type: opts?.source_type ?? "cook_from_what_i_have",
      count: opts?.count ?? 3,
    },
  });
  if (error) throw error;
  return (data?.recipes ?? []) as GeneratedRecipe[];
}

export async function markRecipeCooked(recipe_id: string) {
  const { data, error } = await supabase.functions.invoke("mark-recipe-cooked", {
    body: { recipe_id },
  });
  if (error) throw error;
  return data as { ok: boolean; depleted: number; savings_estimate: number | null };
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
