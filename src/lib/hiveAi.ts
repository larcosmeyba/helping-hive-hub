// Client helpers for Hive AI flows.
import { supabase } from "@/integrations/supabase/client";

export async function createFoodWasteAlerts() {
  const { data, error } = await supabase.functions.invoke("create-food-waste-alerts");
  if (error) throw error;
  return data as { alerts_created: number; alerts: any[] };
}

export async function scanInventoryPhoto(imageBase64: string, scanType: "pantry" | "fridge" | "freezer" | "receipt" = "pantry") {
  const { data, error } = await supabase.functions.invoke("scan-inventory-photo", {
    body: { image_base64: imageBase64, scan_type: scanType },
  });
  if (error) throw error;
  return data as { photo_id: string; detected_items: Array<{ item_name: string; quantity?: string; unit?: string; category?: string; location?: string }> };
}

export async function fetchFoodWasteAlerts() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("food_waste_alerts")
    .select("*")
    .eq("user_id", user.id)
    .eq("resolved", false)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
