
-- =========================================================
-- Help The Hive — Budget Meal data tables (reference/seed)
-- All planning estimates. Publicly readable.
-- =========================================================

-- 1) Food items database
CREATE TABLE public.budget_food_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_item text NOT NULL,
  brand text,
  store text,
  category text,
  is_protein boolean DEFAULT false,
  is_vegetable boolean DEFAULT false,
  is_fruit boolean DEFAULT false,
  is_carbohydrate boolean DEFAULT false,
  is_dairy boolean DEFAULT false,
  is_frozen boolean DEFAULT false,
  is_canned boolean DEFAULT false,
  is_shelf_stable boolean DEFAULT false,
  serving_size text,
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  estimated_cost numeric,
  cost_per_serving numeric,
  household_size_supported text,
  expiration_type text,
  storage_type text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.budget_food_items TO anon, authenticated;
GRANT ALL ON public.budget_food_items TO service_role;
ALTER TABLE public.budget_food_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read budget_food_items" ON public.budget_food_items FOR SELECT USING (true);
CREATE POLICY "Admins manage budget_food_items" ON public.budget_food_items FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 2) Cheap meals (100)
CREATE TABLE public.cheap_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_name text NOT NULL,
  meal_type text, -- Breakfast / Lunch / Dinner
  ingredients text,
  estimated_total_cost numeric,
  cost_per_serving numeric,
  protein_per_serving_g numeric,
  calories_per_serving numeric,
  preparation_time text,
  difficulty text,
  family_friendly text,
  kid_friendly text,
  store_availability text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cheap_meals TO anon, authenticated;
GRANT ALL ON public.cheap_meals TO service_role;
ALTER TABLE public.cheap_meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read cheap_meals" ON public.cheap_meals FOR SELECT USING (true);
CREATE POLICY "Admins manage cheap_meals" ON public.cheap_meals FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 3) Budget recipes (100)
CREATE TABLE public.budget_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_name text NOT NULL,
  ingredients text,
  instructions text,
  cost_estimate numeric,
  cost_per_serving numeric,
  servings numeric,
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  preparation_time text,
  difficulty text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.budget_recipes TO anon, authenticated;
GRANT ALL ON public.budget_recipes TO service_role;
ALTER TABLE public.budget_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read budget_recipes" ON public.budget_recipes FOR SELECT USING (true);
CREATE POLICY "Admins manage budget_recipes" ON public.budget_recipes FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 4) Budget staples (100)
CREATE TABLE public.budget_staples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  priority_ranking integer,
  food_item text NOT NULL,
  store text,
  estimated_cost_pack numeric,
  cost_per_serving numeric,
  protein_per_dollar_g numeric,
  calories_per_dollar numeric,
  meals_it_can_be_used_in text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.budget_staples TO anon, authenticated;
GRANT ALL ON public.budget_staples TO service_role;
ALTER TABLE public.budget_staples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read budget_staples" ON public.budget_staples FOR SELECT USING (true);
CREATE POLICY "Admins manage budget_staples" ON public.budget_staples FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 5) Weekly meal plans (per-day rows)
CREATE TABLE public.weekly_meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_tier text NOT NULL,        -- '$25','$50','$75','$100','$150'
  weekly_budget numeric NOT NULL,
  supports_people integer NOT NULL,
  day_of_week text NOT NULL,      -- Mon..Sun
  day_order integer NOT NULL,     -- 1..7
  breakfast text,
  lunch text,
  dinner text,
  snack text,
  daily_cost numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_tier, day_order)
);
GRANT SELECT ON public.weekly_meal_plans TO anon, authenticated;
GRANT ALL ON public.weekly_meal_plans TO service_role;
ALTER TABLE public.weekly_meal_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read weekly_meal_plans" ON public.weekly_meal_plans FOR SELECT USING (true);
CREATE POLICY "Admins manage weekly_meal_plans" ON public.weekly_meal_plans FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 6) Weekly totals
CREATE TABLE public.meal_plan_weekly_totals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_tier text NOT NULL UNIQUE,
  weekly_budget numeric NOT NULL,
  supports_people integer NOT NULL,
  avg_calories_per_person_per_day numeric,
  protein_g_per_week numeric,
  calories_per_week numeric,
  weekly_cost numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.meal_plan_weekly_totals TO anon, authenticated;
GRANT ALL ON public.meal_plan_weekly_totals TO service_role;
ALTER TABLE public.meal_plan_weekly_totals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read meal_plan_weekly_totals" ON public.meal_plan_weekly_totals FOR SELECT USING (true);
CREATE POLICY "Admins manage meal_plan_weekly_totals" ON public.meal_plan_weekly_totals FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- updated_at triggers
CREATE TRIGGER trg_budget_food_items_updated BEFORE UPDATE ON public.budget_food_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cheap_meals_updated BEFORE UPDATE ON public.cheap_meals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_budget_recipes_updated BEFORE UPDATE ON public.budget_recipes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_budget_staples_updated BEFORE UPDATE ON public.budget_staples FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_weekly_meal_plans_updated BEFORE UPDATE ON public.weekly_meal_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_meal_plan_weekly_totals_updated BEFORE UPDATE ON public.meal_plan_weekly_totals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helpful indexes for generator queries
CREATE INDEX idx_food_items_category ON public.budget_food_items(category);
CREATE INDEX idx_food_items_cost_per_serving ON public.budget_food_items(cost_per_serving);
CREATE INDEX idx_cheap_meals_type ON public.cheap_meals(meal_type);
CREATE INDEX idx_cheap_meals_cps ON public.cheap_meals(cost_per_serving);
CREATE INDEX idx_recipes_cps ON public.budget_recipes(cost_per_serving);
CREATE INDEX idx_staples_rank ON public.budget_staples(priority_ranking);
CREATE INDEX idx_wmp_tier ON public.weekly_meal_plans(plan_tier, day_order);
