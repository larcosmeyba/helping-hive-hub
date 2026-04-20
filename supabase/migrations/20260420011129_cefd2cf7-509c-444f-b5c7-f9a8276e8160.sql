CREATE TABLE IF NOT EXISTS public.bls_regional_cpi_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region TEXT NOT NULL UNIQUE,
  region_code TEXT NOT NULL,
  multiplier NUMERIC NOT NULL DEFAULT 1.0,
  last_cpi_value NUMERIC,
  national_avg_cpi NUMERIC,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bls_regional_cpi_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view BLS cache"
ON public.bls_regional_cpi_cache FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role can manage BLS cache"
ON public.bls_regional_cpi_cache FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');