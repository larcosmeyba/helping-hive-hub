import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface KrogerPrice {
  productId: string;
  description: string;
  brand: string;
  imageUrl: string | null;
  regularPrice: number;
  salePrice: number | null;
  size: string;
  isOnSale: boolean;
}

interface KrogerPriceMap {
  [ingredientName: string]: KrogerPrice;
}

export function useKrogerPrices() {
  const [prices, setPrices] = useState<KrogerPriceMap>({});
  const [loading, setLoading] = useState(false);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string | null>(null);

  const findNearestStore = useCallback(async (zipCode: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("kroger-sync", {
        body: { action: "find-locations", zipCode },
      });
      if (error || !data?.locations?.length) return null;
      const store = data.locations[0];
      setLocationId(store.locationId);
      setStoreName(store.name);
      return store;
    } catch {
      return null;
    }
  }, []);

  const fetchPricesForItems = useCallback(async (items: string[], locId?: string, zipCode?: string) => {
    const storeId = locId || locationId;
    if (!storeId || !items.length) return;
    
    setLoading(true);
    try {
      const uniqueItems = [...new Set(items.map(i => i.toLowerCase().trim()))];

      const { data, error } = await supabase.functions.invoke("kroger-sync", {
        body: {
          action: "batch-lookup",
          items: uniqueItems,
          locationId: storeId,
          zipCode,
        },
      });

      if (error || !data?.prices) {
        setLoading(false);
        return;
      }

      setPrices(prev => ({ ...prev, ...data.prices }));
    } catch {
      // Silently fail — grocery list still works with estimated prices
    }
    setLoading(false);
  }, [locationId]);

  return {
    prices,
    loading,
    locationId,
    storeName,
    findNearestStore,
    fetchPricesForItems,
  };
}
