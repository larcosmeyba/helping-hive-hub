
-- Cache for Open Food Facts community-submitted prices
CREATE TABLE public.open_prices_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name TEXT NOT NULL,
  price NUMERIC,
  currency TEXT DEFAULT 'USD',
  store TEXT,
  city TEXT,
  submitted_date DATE,
  product_name TEXT,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (item_name)
);
ALTER TABLE public.open_prices_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view open prices cache" ON public.open_prices_cache
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role can manage open prices cache" ON public.open_prices_cache
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE INDEX idx_open_prices_cache_cached_at ON public.open_prices_cache(cached_at);

-- Cache for SerpApi Google Shopping (per item + zip)
CREATE TABLE public.google_shopping_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (item_name, zip_code)
);
ALTER TABLE public.google_shopping_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view google shopping cache" ON public.google_shopping_cache
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role can manage google shopping cache" ON public.google_shopping_cache
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE INDEX idx_google_shopping_cache_cached_at ON public.google_shopping_cache(cached_at);

-- Daily SerpApi spend tracker (one row per UTC day) for hard cap enforcement
CREATE TABLE public.serpapi_usage (
  usage_date DATE NOT NULL PRIMARY KEY,
  call_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.serpapi_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage serpapi usage" ON public.serpapi_usage
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
