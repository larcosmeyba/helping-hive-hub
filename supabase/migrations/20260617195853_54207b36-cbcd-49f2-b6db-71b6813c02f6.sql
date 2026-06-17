
-- ============================================================
-- package_prices: whole-package real prices per store/ZIP
-- ============================================================
CREATE TABLE public.package_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  brand TEXT,
  store TEXT NOT NULL,
  zip_prefix TEXT,
  package_size NUMERIC NOT NULL,
  package_unit TEXT NOT NULL,
  package_price NUMERIC NOT NULL,
  servings_per_package NUMERIC,
  unit_price NUMERIC,
  category TEXT,
  as_of_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT DEFAULT 'csv_seed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_package_prices_lookup ON public.package_prices (store, item_key);
CREATE INDEX idx_package_prices_item ON public.package_prices (item_key);

GRANT SELECT ON public.package_prices TO anon, authenticated;
GRANT ALL ON public.package_prices TO service_role;
ALTER TABLE public.package_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read package prices"
  ON public.package_prices FOR SELECT
  USING (true);

CREATE POLICY "Admins manage package prices"
  ON public.package_prices FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_package_prices_updated_at
  BEFORE UPDATE ON public.package_prices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- channel_pricing_config: fees & markup per store/channel
-- ============================================================
CREATE TABLE public.channel_pricing_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('in_store','delivery')),
  item_markup_pct NUMERIC NOT NULL DEFAULT 0,
  service_fee NUMERIC NOT NULL DEFAULT 0,
  delivery_fee NUMERIC NOT NULL DEFAULT 0,
  bag_fee NUMERIC NOT NULL DEFAULT 0,
  tip_default_pct NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 0.0725,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store, channel)
);

GRANT SELECT ON public.channel_pricing_config TO anon, authenticated;
GRANT ALL ON public.channel_pricing_config TO service_role;
ALTER TABLE public.channel_pricing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read channel pricing config"
  ON public.channel_pricing_config FOR SELECT USING (true);

CREATE POLICY "Admins manage channel pricing config"
  ON public.channel_pricing_config FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_channel_pricing_config_updated_at
  BEFORE UPDATE ON public.channel_pricing_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults. Delivery rows model Instacart-style markup + fees.
INSERT INTO public.channel_pricing_config
  (store, channel, item_markup_pct, service_fee, delivery_fee, bag_fee, tip_default_pct, tax_rate, notes)
VALUES
  ('walmart','in_store',0,0,0,0,0,0.0725,'In-store pickup'),
  ('walmart','delivery',0.15,4.99,3.99,0,0.10,0.0725,'Walmart+/Instacart estimate'),
  ('aldi','in_store',0,0,0,0,0,0.0725,'In-store'),
  ('aldi','delivery',0.20,5.99,3.99,0.25,0.10,0.0725,'Instacart delivery'),
  ('dollar_general','in_store',0,0,0,0,0,0.0725,'In-store'),
  ('dollar_general','delivery',0.18,5.99,3.99,0,0.10,0.0725,'Instacart delivery'),
  ('dollar_tree','in_store',0,0,0,0,0,0.0725,'In-store'),
  ('dollar_tree','delivery',0.18,5.99,3.99,0,0.10,0.0725,'Instacart delivery'),
  ('family_dollar','in_store',0,0,0,0,0,0.0725,'In-store'),
  ('family_dollar','delivery',0.18,5.99,3.99,0,0.10,0.0725,'Instacart delivery'),
  ('winco','in_store',0,0,0,0,0,0.0725,'In-store'),
  ('winco','delivery',0.20,5.99,3.99,0,0.10,0.0725,'Limited delivery'),
  ('food_4_less','in_store',0,0,0,0,0,0.0725,'In-store'),
  ('food_4_less','delivery',0.18,5.99,3.99,0,0.10,0.0725,'Instacart delivery'),
  ('kroger','in_store',0,0,0,0,0,0.0725,'In-store'),
  ('kroger','delivery',0.15,4.99,3.99,0,0.10,0.0725,'Kroger Delivery'),
  ('grocery_outlet','in_store',0,0,0,0,0,0.0725,'In-store'),
  ('grocery_outlet','delivery',0.20,5.99,3.99,0,0.10,0.0725,'Instacart delivery'),
  ('smart_final','in_store',0,0,0,0,0,0.0725,'In-store'),
  ('smart_final','delivery',0.18,5.99,3.99,0,0.10,0.0725,'Instacart delivery'),
  ('instacart','in_store',0,0,0,0,0,0.0725,'N/A — delivery default'),
  ('instacart','delivery',0.18,5.99,3.99,0,0.10,0.0725,'Generic Instacart'),
  ('default','in_store',0,0,0,0,0,0.0725,'Fallback in-store'),
  ('default','delivery',0.18,5.99,3.99,0,0.10,0.0725,'Fallback delivery');

-- ============================================================
-- meal_plan_cost_breakdown: one row per generated plan
-- ============================================================
CREATE TABLE public.meal_plan_cost_breakdown (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_plan_id UUID NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  channel TEXT NOT NULL DEFAULT 'delivery',
  store TEXT,
  zip_code TEXT,
  in_store_subtotal NUMERIC NOT NULL DEFAULT 0,
  item_markup NUMERIC NOT NULL DEFAULT 0,
  service_fee NUMERIC NOT NULL DEFAULT 0,
  delivery_fee NUMERIC NOT NULL DEFAULT 0,
  bag_fee NUMERIC NOT NULL DEFAULT 0,
  tip NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  delivered_total NUMERIC NOT NULL DEFAULT 0,
  budget NUMERIC,
  remaining NUMERIC,
  budget_exceeded BOOLEAN NOT NULL DEFAULT false,
  warning_text TEXT,
  pantry_savings NUMERIC NOT NULL DEFAULT 0,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (meal_plan_id)
);
CREATE INDEX idx_meal_plan_cost_breakdown_user ON public.meal_plan_cost_breakdown (user_id);

GRANT SELECT ON public.meal_plan_cost_breakdown TO authenticated;
GRANT ALL ON public.meal_plan_cost_breakdown TO service_role;
ALTER TABLE public.meal_plan_cost_breakdown ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own cost breakdown"
  ON public.meal_plan_cost_breakdown FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_meal_plan_cost_breakdown_updated_at
  BEFORE UPDATE ON public.meal_plan_cost_breakdown
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
