CREATE TABLE IF NOT EXISTS public.walmart_price_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name text NOT NULL,
  zip_code text NOT NULL,
  price numeric,
  title text,
  image text,
  in_stock boolean DEFAULT true,
  cached_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_name, zip_code)
);

CREATE INDEX IF NOT EXISTS idx_walmart_cache_lookup ON public.walmart_price_cache (item_name, zip_code, cached_at DESC);

ALTER TABLE public.walmart_price_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read walmart cache"
  ON public.walmart_price_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role manages walmart cache"
  ON public.walmart_price_cache FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');