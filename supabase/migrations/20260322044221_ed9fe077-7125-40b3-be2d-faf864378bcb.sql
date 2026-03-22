
-- ===========================
-- GROCERY INTELLIGENCE TABLES
-- ===========================

-- 1. retailers
CREATE TABLE public.retailers (
  retailer_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_name text NOT NULL,
  retailer_slug text NOT NULL UNIQUE,
  provider_name text,
  provider_retailer_reference text,
  retailer_logo_url text,
  retailer_status text NOT NULL DEFAULT 'active',
  supports_live_pricing boolean NOT NULL DEFAULT false,
  supports_live_inventory boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.retailers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view retailers" ON public.retailers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage retailers" ON public.retailers FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- 2. store_locations
CREATE TABLE public.store_locations (
  store_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_id uuid NOT NULL REFERENCES public.retailers(retailer_id) ON DELETE CASCADE,
  provider_store_reference text,
  store_name text NOT NULL,
  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  zip_code text,
  latitude numeric,
  longitude numeric,
  phone_number text,
  timezone text,
  store_status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.store_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view stores" ON public.store_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage stores" ON public.store_locations FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- 3. canonical_products
CREATE TABLE public.canonical_products (
  canonical_product_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gtin_upc text,
  canonical_name text NOT NULL,
  canonical_brand text,
  category text,
  subcategory text,
  size_value numeric,
  size_unit text,
  normalized_size_text text,
  ingredient_type text,
  nutrition_source text,
  nutrition_reference_id text,
  default_image_url text,
  is_generic boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.canonical_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view canonical products" ON public.canonical_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage canonical products" ON public.canonical_products FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE INDEX idx_canonical_products_gtin ON public.canonical_products(gtin_upc);

-- 4. canonical_product_aliases
CREATE TABLE public.canonical_product_aliases (
  alias_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_product_id uuid NOT NULL REFERENCES public.canonical_products(canonical_product_id) ON DELETE CASCADE,
  alias_text text NOT NULL,
  alias_type text DEFAULT 'common_name',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.canonical_product_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view aliases" ON public.canonical_product_aliases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage aliases" ON public.canonical_product_aliases FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE INDEX idx_aliases_canonical ON public.canonical_product_aliases(canonical_product_id);

-- 5. retailer_products
CREATE TABLE public.retailer_products (
  retailer_product_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_id uuid NOT NULL REFERENCES public.retailers(retailer_id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.store_locations(store_id) ON DELETE SET NULL,
  provider_name text,
  provider_product_reference text,
  retailer_sku text,
  gtin_upc text,
  retailer_product_title text NOT NULL,
  retailer_brand text,
  retailer_category text,
  package_size_text text,
  size_value numeric,
  size_unit text,
  image_url text,
  product_url text,
  canonical_product_id uuid REFERENCES public.canonical_products(canonical_product_id) ON DELETE SET NULL,
  active_status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.retailer_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view retailer products" ON public.retailer_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage retailer products" ON public.retailer_products FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE INDEX idx_retailer_products_gtin ON public.retailer_products(gtin_upc);
CREATE INDEX idx_retailer_products_retailer ON public.retailer_products(retailer_id);
CREATE INDEX idx_retailer_products_store ON public.retailer_products(store_id);
CREATE INDEX idx_retailer_products_canonical ON public.retailer_products(canonical_product_id);
CREATE INDEX idx_retailer_products_provider_ref ON public.retailer_products(provider_product_reference);

-- 6. store_product_prices
CREATE TABLE public.store_product_prices (
  store_price_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_product_id uuid NOT NULL REFERENCES public.retailer_products(retailer_product_id) ON DELETE CASCADE,
  retailer_id uuid NOT NULL REFERENCES public.retailers(retailer_id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.store_locations(store_id) ON DELETE SET NULL,
  zip_code_context text,
  currency_code text NOT NULL DEFAULT 'USD',
  base_price numeric NOT NULL,
  sale_price numeric,
  loyalty_price numeric,
  promo_text text,
  unit_price numeric,
  unit_price_basis text,
  in_stock boolean DEFAULT true,
  inventory_status text DEFAULT 'available',
  source_system text NOT NULL,
  source_confidence text DEFAULT 'high',
  last_verified_at timestamptz NOT NULL DEFAULT now(),
  freshness_status text NOT NULL DEFAULT 'recent',
  raw_source_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.store_product_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view prices" ON public.store_product_prices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage prices" ON public.store_product_prices FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE INDEX idx_prices_retailer_product ON public.store_product_prices(retailer_product_id);
CREATE INDEX idx_prices_store ON public.store_product_prices(store_id);
CREATE INDEX idx_prices_freshness ON public.store_product_prices(freshness_status);

-- 7. product_price_history
CREATE TABLE public.product_price_history (
  price_history_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_product_id uuid NOT NULL REFERENCES public.retailer_products(retailer_product_id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.store_locations(store_id) ON DELETE SET NULL,
  observed_price numeric NOT NULL,
  observed_sale_price numeric,
  observed_at timestamptz NOT NULL DEFAULT now(),
  source_system text NOT NULL,
  freshness_status text,
  raw_source_payload jsonb
);
ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view price history" ON public.product_price_history FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can manage price history" ON public.product_price_history FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE INDEX idx_price_history_product ON public.product_price_history(retailer_product_id);
CREATE INDEX idx_price_history_observed ON public.product_price_history(observed_at);

-- 8. household_store_preferences
CREATE TABLE public.household_store_preferences (
  household_store_preference_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  preferred_retailer_id uuid REFERENCES public.retailers(retailer_id) ON DELETE SET NULL,
  preferred_store_id uuid REFERENCES public.store_locations(store_id) ON DELETE SET NULL,
  zip_code text,
  address_line_1 text,
  city text,
  state text,
  latitude numeric,
  longitude numeric,
  primary_store_flag boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.household_store_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own store preferences" ON public.household_store_preferences FOR ALL TO authenticated USING (auth.uid() = household_id) WITH CHECK (auth.uid() = household_id);

-- 9. ingredient_product_mapping
CREATE TABLE public.ingredient_product_mapping (
  ingredient_mapping_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_ingredient_text text NOT NULL,
  canonical_product_id uuid REFERENCES public.canonical_products(canonical_product_id) ON DELETE SET NULL,
  preferred_retailer_product_id uuid REFERENCES public.retailer_products(retailer_product_id) ON DELETE SET NULL,
  mapping_method text DEFAULT 'auto',
  mapping_confidence text DEFAULT 'medium',
  manual_override boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ingredient_product_mapping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view mappings" ON public.ingredient_product_mapping FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage mappings" ON public.ingredient_product_mapping FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE INDEX idx_mapping_canonical ON public.ingredient_product_mapping(canonical_product_id);
CREATE INDEX idx_mapping_retailer ON public.ingredient_product_mapping(preferred_retailer_product_id);

-- 10. provider_sync_logs
CREATE TABLE public.provider_sync_logs (
  sync_log_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name text NOT NULL,
  sync_type text NOT NULL,
  retailer_id uuid REFERENCES public.retailers(retailer_id) ON DELETE SET NULL,
  store_id uuid REFERENCES public.store_locations(store_id) ON DELETE SET NULL,
  request_reference text,
  request_status text NOT NULL DEFAULT 'pending',
  records_created integer DEFAULT 0,
  records_updated integer DEFAULT 0,
  records_failed integer DEFAULT 0,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE public.provider_sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view sync logs" ON public.provider_sync_logs FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can manage sync logs" ON public.provider_sync_logs FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- updated_at triggers
CREATE TRIGGER update_retailers_updated_at BEFORE UPDATE ON public.retailers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_store_locations_updated_at BEFORE UPDATE ON public.store_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_canonical_products_updated_at BEFORE UPDATE ON public.canonical_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_retailer_products_updated_at BEFORE UPDATE ON public.retailer_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_store_product_prices_updated_at BEFORE UPDATE ON public.store_product_prices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_household_store_prefs_updated_at BEFORE UPDATE ON public.household_store_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ingredient_mapping_updated_at BEFORE UPDATE ON public.ingredient_product_mapping FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
