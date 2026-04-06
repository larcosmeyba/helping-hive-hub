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

  const fetchPricesForItems = useCallback(async (items: string[], locId?: string) => {
    const storeId = locId || locationId;
    if (!storeId || !items.length) return;
    
    setLoading(true);
    const newPrices: KrogerPriceMap = { ...prices };

    // Batch items in groups to avoid too many API calls
    const uniqueItems = [...new Set(items)].filter(item => !newPrices[item.toLowerCase()]);
    
    for (const item of uniqueItems) {
      try {
        const { data, error } = await supabase.functions.invoke("kroger-sync", {
          body: { action: "search-products", searchTerm: item, locationId: storeId },
        });
        if (error || !data?.products?.length) continue;
        
        // Take the best match (first result)
        const product = data.products[0];
        const price = product.price;
        
        newPrices[item.toLowerCase()] = {
          productId: product.productId,
          description: product.description,
          brand: product.brand,
          imageUrl: product.imageUrl || null,
          regularPrice: price?.regular || 0,
          salePrice: price?.promo && price.promo < price.regular ? price.promo : null,
          size: product.size || "",
          isOnSale: !!(price?.promo && price.promo < price.regular),
        };
      } catch {
        // Skip failed items
      }
    }

    setPrices(newPrices);
    setLoading(false);
  }, [locationId, prices]);

  return {
    prices,
    loading,
    locationId,
    storeName,
    findNearestStore,
    fetchPricesForItems,
  };
}
