-- Token cache for Instacart OAuth (service-role only)
CREATE TABLE public.instacart_access_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  access_token TEXT NOT NULL,
  token_type TEXT NOT NULL DEFAULT 'Bearer',
  scope TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_instacart_tokens_env_expires
  ON public.instacart_access_tokens (environment, expires_at DESC);

ALTER TABLE public.instacart_access_tokens ENABLE ROW LEVEL SECURITY;

-- No policies = no access for authenticated/anon roles. Only service role bypasses RLS.

CREATE TRIGGER trg_instacart_tokens_updated
BEFORE UPDATE ON public.instacart_access_tokens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- User's chosen home store on Instacart
CREATE TABLE public.instacart_home_store (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  retailer_key TEXT NOT NULL,
  retailer_name TEXT NOT NULL,
  retailer_logo_url TEXT,
  postal_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.instacart_home_store ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own home store"
  ON public.instacart_home_store FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own home store"
  ON public.instacart_home_store FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own home store"
  ON public.instacart_home_store FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own home store"
  ON public.instacart_home_store FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_instacart_home_store_updated
BEFORE UPDATE ON public.instacart_home_store
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();