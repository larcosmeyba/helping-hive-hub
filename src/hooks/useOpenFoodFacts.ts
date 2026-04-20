import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface OFFProduct {
  image: string | null;
  brand: string | null;
  productName: string | null;
  calories: number | null; // kcal per 100g
  protein: number | null;  // g per 100g
  carbs: number | null;    // g per 100g
  fat: number | null;      // g per 100g
}

export type OFFProductMap = Record<string, OFFProduct>;

export function useOpenFoodFacts() {
  const [products, setProducts] = useState<OFFProductMap>({});
  const [loading, setLoading] = useState(false);

  const fetchProducts = useCallback(async (items: string[]) => {
    if (!items.length) return;
    setLoading(true);
    try {
      const uniqueItems = [...new Set(items.map((i) => i.toLowerCase().trim()).filter(Boolean))];
      const { data, error } = await supabase.functions.invoke("open-food-facts", {
        body: { items: uniqueItems },
      });
      if (error || !data?.products) {
        setLoading(false);
        return;
      }
      setProducts((prev) => ({ ...prev, ...data.products }));
    } catch {
      // Silent fail — pages still work without enhanced data
    }
    setLoading(false);
  }, []);

  return { products, loading, fetchProducts };
}
