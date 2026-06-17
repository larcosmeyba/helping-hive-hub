
-- Kroger integration tables

CREATE TABLE public.kroger_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL UNIQUE,
  name text NOT NULL,
  address text,
  city text,
  state text,
  zip_code text,
  latitude numeric,
  longitude numeric,
  phone text,
  hours jsonb,
  raw jsonb,
  cached_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.kroger_locations TO authenticated, anon;
GRANT ALL ON public.kroger_locations TO service_role;
ALTER TABLE public.kroger_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read kroger locations" ON public.kroger_locations FOR SELECT USING (true);
CREATE POLICY "Service role manages kroger locations" ON public.kroger_locations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX kroger_locations_zip_idx ON public.kroger_locations(zip_code);
CREATE INDEX kroger_locations_state_city_idx ON public.kroger_locations(state, city);

CREATE TABLE public.kroger_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL UNIQUE,
  upc text,
  name text NOT NULL,
  brand text,
  size text,
  category text,
  image_url text,
  raw jsonb,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.kroger_products TO authenticated, anon;
GRANT ALL ON public.kroger_products TO service_role;
ALTER TABLE public.kroger_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read kroger products" ON public.kroger_products FOR SELECT USING (true);
CREATE POLICY "Service role manages kroger products" ON public.kroger_products FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX kroger_products_upc_idx ON public.kroger_products(upc);
CREATE INDEX kroger_products_name_idx ON public.kroger_products USING gin (name gin_trgm_ops);

CREATE TABLE public.kroger_pricing_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  location_id text NOT NULL,
  regular_price numeric,
  promo_price numeric,
  currency text NOT NULL DEFAULT 'USD',
  size text,
  stock_level text,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, location_id)
);
GRANT SELECT ON public.kroger_pricing_cache TO authenticated;
GRANT ALL ON public.kroger_pricing_cache TO service_role;
ALTER TABLE public.kroger_pricing_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read pricing" ON public.kroger_pricing_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role manages pricing" ON public.kroger_pricing_cache FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX kroger_pricing_cache_fetched_idx ON public.kroger_pricing_cache(fetched_at);

CREATE TABLE public.kroger_product_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grocery_list_item_id uuid,
  ingredient_name text NOT NULL,
  location_id text,
  product_id text,
  upc text,
  matched_name text,
  brand text,
  size text,
  image_url text,
  unit_price numeric,
  confidence numeric,
  status text NOT NULL DEFAULT 'matched',
  matched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kroger_product_matches TO authenticated;
GRANT ALL ON public.kroger_product_matches TO service_role;
ALTER TABLE public.kroger_product_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their matches" ON public.kroger_product_matches FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert their matches" ON public.kroger_product_matches FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete their matches" ON public.kroger_product_matches FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role manages matches" ON public.kroger_product_matches FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX kroger_matches_user_idx ON public.kroger_product_matches(user_id);
CREATE INDEX kroger_matches_status_idx ON public.kroger_product_matches(status);

-- Server-to-server client-credentials token cache
CREATE TABLE public.kroger_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment text NOT NULL UNIQUE,
  access_token text NOT NULL,
  token_type text,
  scope text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.kroger_access_tokens TO service_role;
ALTER TABLE public.kroger_access_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON public.kroger_access_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Per-user OAuth tokens (authorization_code flow)
CREATE TABLE public.kroger_user_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  environment text NOT NULL DEFAULT 'certification',
  access_token text NOT NULL,
  refresh_token text,
  scope text,
  token_type text,
  expires_at timestamptz NOT NULL,
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, environment)
);
GRANT SELECT, DELETE ON public.kroger_user_tokens TO authenticated;
GRANT ALL ON public.kroger_user_tokens TO service_role;
ALTER TABLE public.kroger_user_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see their kroger connection" ON public.kroger_user_tokens FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users disconnect their kroger" ON public.kroger_user_tokens FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role manages user tokens" ON public.kroger_user_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Short-lived state values for OAuth CSRF protection
CREATE TABLE public.kroger_oauth_states (
  state text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redirect_after text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes')
);
GRANT ALL ON public.kroger_oauth_states TO service_role;
ALTER TABLE public.kroger_oauth_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only states" ON public.kroger_oauth_states FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Add user's preferred Kroger store to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS kroger_location_id text,
  ADD COLUMN IF NOT EXISTS kroger_store_name text,
  ADD COLUMN IF NOT EXISTS kroger_store_zip text;

-- updated_at triggers
CREATE TRIGGER kroger_locations_updated BEFORE UPDATE ON public.kroger_locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER kroger_products_updated BEFORE UPDATE ON public.kroger_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER kroger_access_tokens_updated BEFORE UPDATE ON public.kroger_access_tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER kroger_user_tokens_updated BEFORE UPDATE ON public.kroger_user_tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
