import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface OpenPrice {
  price: number | null;
  currency: string;
  store: string | null;
  city: string | null;
  date: string | null;
  productName: string | null;
  source: "open_prices";
}

export type OpenPriceMap = Record<string, OpenPrice>;

export function useOpenPrices() {
  const [prices, setPrices] = useState<OpenPriceMap>({});
  const [loading, setLoading] = useState(false);

  const fetchPrices = useCallback(async (items: string[]) => {
    if (!items.length) return;
    setLoading(true);
    try {
      const uniqueItems = [...new Set(items.map((i) => i.toLowerCase().trim()).filter(Boolean))];
      const { data, error } = await supabase.functions.invoke("open-prices", {
        body: { items: uniqueItems },
      });
      if (error || !data?.prices) {
        setLoading(false);
        return;
      }
      setPrices((prev) => ({ ...prev, ...data.prices }));
    } catch {
      // Silent fail — community pricing is enhancement-only
    }
    setLoading(false);
  }, []);

  return { prices, loading, fetchPrices };
}
