import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GoogleShoppingResult {
  price: number;
  store: string;
  title: string;
  image: string | null;
  link: string | null;
  source: "serpapi_google_shopping";
}

export type GoogleShoppingMap = Record<string, GoogleShoppingResult[]>;

export function useGoogleShoppingPrices() {
  const [prices, setPrices] = useState<GoogleShoppingMap>({});
  const [loading, setLoading] = useState(false);

  const fetchPrices = useCallback(async (items: string[], zipCode: string) => {
    if (!items.length || !zipCode) return;
    setLoading(true);
    try {
      const uniqueItems = [...new Set(items.map((i) => i.toLowerCase().trim()).filter(Boolean))];
      const { data, error } = await supabase.functions.invoke("serpapi-google-shopping", {
        body: { items: uniqueItems, zipCode },
      });
      if (error || !data?.prices) {
        setLoading(false);
        return;
      }
      setPrices((prev) => ({ ...prev, ...data.prices }));
    } catch {
      // Silent fail — falls through to next pricing layer
    }
    setLoading(false);
  }, []);

  return { prices, loading, fetchPrices };
}
