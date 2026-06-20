// Client helper for adding items to the user's grocery list from any feature.
// Routes through the `grocery-list-add-items` edge function which handles
// pantry skip, dedupe, and the active-list singleton.
//
// IMPORTANT: This does NOT touch the Instacart flow. The existing
// ShopGroceriesButton + instacart-create-list edge function remain the
// single approved path to Instacart.

import { supabase } from "@/integrations/supabase/client";

export type GrocerySourceType =
  | "meal_plan"
  | "cook_from_what_i_have"
  | "fridge_chef"
  | "food_waste"
  | "pantry_low_stock"
  | "manual"
  | "manual_add"
  | "bulk_buying";

export interface AddGroceryItem {
  item_name: string;
  quantity?: string | number;
  unit?: string;
  category?: string;
  estimated_price?: number;
  instacart_search_term?: string;
  needed_for_meals?: string[];
  source_ref_id?: string;
}

export interface AddItemsResult {
  grocery_list_id: string;
  added: number;
  merged: number;
  skipped: string[];
  estimated_total: number;
}

export async function addItemsToGroceryList(
  source_type: GrocerySourceType,
  items: AddGroceryItem[],
): Promise<AddItemsResult> {
  const { data, error } = await supabase.functions.invoke("grocery-list-add-items", {
    body: { source_type, items },
  });
  if (error) throw error;
  // Fire-and-forget analytics — never block the caller.
  try {
    const { trackEvent } = await import("@/lib/analytics");
    void trackEvent("grocery_item_added", { source_type, count: items.length });
  } catch { /* swallow */ }
  return data as AddItemsResult;
}
