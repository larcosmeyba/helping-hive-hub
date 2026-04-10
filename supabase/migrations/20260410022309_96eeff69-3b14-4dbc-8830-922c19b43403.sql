
-- Add default pricing fields to canonical_products
ALTER TABLE public.canonical_products 
ADD COLUMN IF NOT EXISTS default_price numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS default_unit text DEFAULT NULL;

-- Add index for fast ingredient lookups by name
CREATE INDEX IF NOT EXISTS idx_canonical_products_name_lower 
ON public.canonical_products (lower(canonical_name));

-- Add index on aliases for synonym matching
CREATE INDEX IF NOT EXISTS idx_canonical_aliases_text_lower 
ON public.canonical_product_aliases (lower(alias_text));
