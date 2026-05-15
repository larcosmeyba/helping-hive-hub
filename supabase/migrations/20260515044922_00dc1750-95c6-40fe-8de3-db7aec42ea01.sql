DROP TABLE IF EXISTS public.walmart_price_cache CASCADE;
DROP TABLE IF EXISTS public.google_shopping_cache CASCADE;
DROP TABLE IF EXISTS public.open_prices_cache CASCADE;

ALTER TABLE public.instacart_access_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages instacart tokens"
ON public.instacart_access_tokens
FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');