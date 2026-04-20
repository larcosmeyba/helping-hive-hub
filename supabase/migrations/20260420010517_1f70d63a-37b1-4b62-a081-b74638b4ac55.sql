CREATE TABLE IF NOT EXISTS public.open_food_facts_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name text NOT NULL UNIQUE,
  product_name text,
  image text,
  brand text,
  calories numeric,
  protein numeric,
  carbs numeric,
  fat numeric,
  cached_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_off_cache_item_name ON public.open_food_facts_cache(item_name);
CREATE INDEX IF NOT EXISTS idx_off_cache_cached_at ON public.open_food_facts_cache(cached_at);

ALTER TABLE public.open_food_facts_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view OFF cache"
  ON public.open_food_facts_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage OFF cache"
  ON public.open_food_facts_cache FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');