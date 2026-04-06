
-- Add unique constraint for upsert on retailer_products
CREATE UNIQUE INDEX IF NOT EXISTS idx_retailer_products_provider_ref
ON public.retailer_products (retailer_id, provider_product_reference);

-- Add unique constraint for upsert on store_product_prices
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_product_prices_product_retailer
ON public.store_product_prices (retailer_product_id, retailer_id);
