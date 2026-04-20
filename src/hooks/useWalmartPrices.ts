import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface WalmartPrice {
  price: number | null;
  title: string;
  image: string | null;
  inStock: boolean;
}

export type WalmartPriceMap = Record<string, WalmartPrice>;

export function useWalmartPrices() {
  const [prices, setPrices] = useState<WalmartPriceMap>({});
  const [loading, setLoading] = useState(false);

  const fetchPrices = useCallback(async (items: string[], zipCode: string) => {
    if (!items.length || !zipCode) return;
    setLoading(true);
    try {
      const uniqueItems = [...new Set(items.map((i) => i.toLowerCase().trim()))];
      const { data, error } = await supabase.functions.invoke("walmart-prices", {
        body: { items: uniqueItems, zipCode },
      });
      if (error || !data?.prices) {
        setLoading(false);
        return;
      }
      setPrices((prev) => ({ ...prev, ...data.prices }));
    } catch {
      // Silent fail — list still works with estimated prices
    }
    setLoading(false);
  }, []);

  return { prices, loading, fetchPrices };
}
