-- 1. INGREDIENTS (USDA-normalized)
CREATE TABLE public.ingredients (
  ingredient_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_name TEXT NOT NULL,
  category TEXT,
  usda_food_id TEXT UNIQUE,
  usda_description TEXT,
  serving_size TEXT,
  serving_size_grams NUMERIC,
  calories NUMERIC,
  protein_g NUMERIC,
  carbs_g NUMERIC,
  fat_g NUMERIC,
  fiber_g NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ingredients_name ON public.ingredients (lower(ingredient_name));
CREATE INDEX idx_ingredients_usda ON public.ingredients (usda_food_id);
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view ingredients" ON public.ingredients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage ingredients" ON public.ingredients FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE TRIGGER trg_ingredients_updated_at BEFORE UPDATE ON public.ingredients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. RECIPE_INGREDIENTS (normalized join)
CREATE TABLE public.recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(ingredient_id) ON DELETE RESTRICT,
  quantity NUMERIC,
  unit TEXT,
  display_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (recipe_id, ingredient_id)
);
CREATE INDEX idx_recipe_ingredients_recipe ON public.recipe_ingredients (recipe_id);
CREATE INDEX idx_recipe_ingredients_ingredient ON public.recipe_ingredients (ingredient_id);
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view recipe ingredients" ON public.recipe_ingredients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage recipe ingredients" ON public.recipe_ingredients FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- 3. REGIONAL_FOOD_PRICES (Layer 2)
CREATE TABLE public.regional_food_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(ingredient_id) ON DELETE CASCADE,
  region TEXT NOT NULL,
  average_price NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  source TEXT,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ingredient_id, region, unit)
);
CREATE INDEX idx_regional_prices_ingredient ON public.regional_food_prices (ingredient_id);
CREATE INDEX idx_regional_prices_region ON public.regional_food_prices (region);
ALTER TABLE public.regional_food_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view regional prices" ON public.regional_food_prices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage regional prices" ON public.regional_food_prices FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- 4. NATIONAL_FOOD_PRICES (Layer 3)
CREATE TABLE public.national_food_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(ingredient_id) ON DELETE CASCADE,
  national_avg_price NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  source TEXT,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ingredient_id, unit)
);
CREATE INDEX idx_national_prices_ingredient ON public.national_food_prices (ingredient_id);
ALTER TABLE public.national_food_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view national prices" ON public.national_food_prices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage national prices" ON public.national_food_prices FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- 5. STATE_TAX_RULES
CREATE TABLE public.state_tax_rules (
  state CHAR(2) PRIMARY KEY,
  state_name TEXT NOT NULL,
  grocery_tax_rate NUMERIC NOT NULL DEFAULT 0,
  local_tax_possible BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.state_tax_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view tax rules" ON public.state_tax_rules FOR SELECT USING (true);
CREATE POLICY "Admins can manage tax rules" ON public.state_tax_rules FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE TRIGGER trg_state_tax_rules_updated_at BEFORE UPDATE ON public.state_tax_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed all 50 states + DC with grocery tax rates (2024 reference)
INSERT INTO public.state_tax_rules (state, state_name, grocery_tax_rate, local_tax_possible, notes) VALUES
('AL','Alabama',0.030,true,'State grocery tax reduced to 3% in 2023; locals add up to 4%'),
('AK','Alaska',0.000,true,'No state sales tax; locals up to 7.5%'),
('AZ','Arizona',0.000,true,'Groceries exempt from state tax; locals may tax'),
('AR','Arkansas',0.00125,true,'Reduced state grocery tax 0.125%'),
('CA','California',0.000,false,'Groceries exempt'),
('CO','Colorado',0.000,true,'Groceries exempt from state; locals may tax'),
('CT','Connecticut',0.000,false,'Groceries exempt'),
('DE','Delaware',0.000,false,'No state sales tax'),
('DC','District of Columbia',0.000,false,'Groceries exempt'),
('FL','Florida',0.000,false,'Groceries exempt'),
('GA','Georgia',0.000,true,'Groceries exempt from state; locals may tax'),
('HI','Hawaii',0.040,true,'GET applies to groceries'),
('ID','Idaho',0.060,false,'Full sales tax on groceries; tax credit available'),
('IL','Illinois',0.010,true,'1% reduced rate on groceries'),
('IN','Indiana',0.000,false,'Groceries exempt'),
('IA','Iowa',0.000,false,'Groceries exempt'),
('KS','Kansas',0.020,true,'Reduced to 2% in 2024; phasing to 0% by 2025'),
('KY','Kentucky',0.000,false,'Groceries exempt'),
('LA','Louisiana',0.000,true,'State exempt; locals up to 7%'),
('ME','Maine',0.000,false,'Groceries exempt'),
('MD','Maryland',0.000,false,'Groceries exempt'),
('MA','Massachusetts',0.000,false,'Groceries exempt'),
('MI','Michigan',0.000,false,'Groceries exempt'),
('MN','Minnesota',0.000,false,'Groceries exempt'),
('MS','Mississippi',0.070,false,'Full 7% sales tax on groceries'),
('MO','Missouri',0.01225,true,'Reduced 1.225% state rate'),
('MT','Montana',0.000,false,'No state sales tax'),
('NE','Nebraska',0.000,true,'Groceries exempt from state'),
('NV','Nevada',0.000,true,'Groceries exempt from state'),
('NH','New Hampshire',0.000,false,'No state sales tax'),
('NJ','New Jersey',0.000,false,'Groceries exempt'),
('NM','New Mexico',0.000,true,'Groceries exempt from state'),
('NY','New York',0.000,true,'Most groceries exempt'),
('NC','North Carolina',0.000,true,'State exempt; 2% local'),
('ND','North Dakota',0.000,true,'Groceries exempt from state'),
('OH','Ohio',0.000,false,'Groceries exempt'),
('OK','Oklahoma',0.000,true,'State grocery tax repealed Aug 2024'),
('OR','Oregon',0.000,false,'No state sales tax'),
('PA','Pennsylvania',0.000,false,'Groceries exempt'),
('RI','Rhode Island',0.000,false,'Groceries exempt'),
('SC','South Carolina',0.000,true,'State exempt; locals may tax'),
('SD','South Dakota',0.042,true,'Reduced to 4.2% in 2023'),
('TN','Tennessee',0.040,true,'4% state grocery rate; locals add up to 2.75%'),
('TX','Texas',0.000,false,'Groceries exempt'),
('UT','Utah',0.030,true,'Reduced 3% combined rate on food'),
('VT','Vermont',0.000,false,'Groceries exempt'),
('VA','Virginia',0.010,true,'1% local on groceries (state portion repealed 2023)'),
('WA','Washington',0.000,false,'Groceries exempt'),
('WV','West Virginia',0.000,false,'Groceries exempt'),
('WI','Wisconsin',0.000,false,'Groceries exempt'),
('WY','Wyoming',0.000,true,'Groceries exempt from state'); 