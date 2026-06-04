
-- Extend meal_plans
ALTER TABLE public.meal_plans
  ADD COLUMN IF NOT EXISTS week_start_date date,
  ADD COLUMN IF NOT EXISTS estimated_daily_average numeric,
  ADD COLUMN IF NOT EXISTS estimated_cost_per_serving numeric,
  ADD COLUMN IF NOT EXISTS total_meals integer,
  ADD COLUMN IF NOT EXISTS savings_estimate numeric,
  ADD COLUMN IF NOT EXISTS why_this_plan jsonb;

-- Extend pantry_items
ALTER TABLE public.pantry_items
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS purchase_date date,
  ADD COLUMN IF NOT EXISTS freshness_status text,
  ADD COLUMN IF NOT EXISTS location text DEFAULT 'pantry';

-- Extend grocery_list_items
ALTER TABLE public.grocery_list_items
  ALTER COLUMN grocery_list_id DROP NOT NULL;
ALTER TABLE public.grocery_list_items
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS already_have boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS instacart_search_term text,
  ADD COLUMN IF NOT EXISTS meal_plan_id uuid,
  ADD COLUMN IF NOT EXISTS needed_for_meals text[] DEFAULT '{}';

-- meal_plan_days
CREATE TABLE IF NOT EXISTS public.meal_plan_days (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_plan_id uuid NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  day_name text NOT NULL,
  date date,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plan_days TO authenticated;
GRANT ALL ON public.meal_plan_days TO service_role;
ALTER TABLE public.meal_plan_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own plan days" ON public.meal_plan_days
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all plan days" ON public.meal_plan_days
  FOR SELECT USING (is_admin(auth.uid()));

-- meal_plan_meals
CREATE TABLE IF NOT EXISTS public.meal_plan_meals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_plan_id uuid NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  day_id uuid REFERENCES public.meal_plan_days(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  meal_type text NOT NULL,
  meal_name text NOT NULL,
  description text,
  estimated_cost numeric,
  estimated_cost_per_serving numeric,
  calories_estimate integer,
  protein_estimate numeric,
  prep_time_minutes integer,
  cook_time_minutes integer,
  difficulty text,
  instructions jsonb DEFAULT '[]'::jsonb,
  food_waste_reason text,
  marked_cooked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plan_meals TO authenticated;
GRANT ALL ON public.meal_plan_meals TO service_role;
ALTER TABLE public.meal_plan_meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own plan meals" ON public.meal_plan_meals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all plan meals" ON public.meal_plan_meals
  FOR SELECT USING (is_admin(auth.uid()));

-- meal_ingredients
CREATE TABLE IF NOT EXISTS public.meal_ingredients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_id uuid NOT NULL REFERENCES public.meal_plan_meals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  item_name text NOT NULL,
  quantity text,
  unit text,
  source text,
  already_have boolean NOT NULL DEFAULT false,
  estimated_price numeric,
  instacart_search_term text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_ingredients TO authenticated;
GRANT ALL ON public.meal_ingredients TO service_role;
ALTER TABLE public.meal_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own meal ingredients" ON public.meal_ingredients
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all meal ingredients" ON public.meal_ingredients
  FOR SELECT USING (is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_meal_plan_days_plan ON public.meal_plan_days(meal_plan_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_meals_plan ON public.meal_plan_meals(meal_plan_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_meals_day ON public.meal_plan_meals(day_id);
CREATE INDEX IF NOT EXISTS idx_meal_ingredients_meal ON public.meal_ingredients(meal_id);
CREATE INDEX IF NOT EXISTS idx_grocery_list_items_plan ON public.grocery_list_items(meal_plan_id);
