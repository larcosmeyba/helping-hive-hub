
-- 1. Extend meal_plans with progress + grocery status + Instacart fields
ALTER TABLE public.meal_plans
  ADD COLUMN IF NOT EXISTS meals_completed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekly_savings numeric,
  ADD COLUMN IF NOT EXISTS food_waste_prevented_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS budget_status text,
  ADD COLUMN IF NOT EXISTS grocery_status text NOT NULL DEFAULT 'not_generated',
  ADD COLUMN IF NOT EXISTS instacart_order_id text,
  ADD COLUMN IF NOT EXISTS grocery_purchase_date timestamp with time zone;

-- 2. Extend meal_plan_meals with image, favorite, cooked timestamp
ALTER TABLE public.meal_plan_meals
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS favorited boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cooked_at timestamp with time zone;

-- 3. Extend meal_ingredients with pantry link + source_location enum-like
ALTER TABLE public.meal_ingredients
  ADD COLUMN IF NOT EXISTS pantry_item_id uuid,
  ADD COLUMN IF NOT EXISTS source_location text;

-- 4. New meal_plan_ai_insights table
CREATE TABLE IF NOT EXISTS public.meal_plan_ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id uuid NOT NULL,
  user_id uuid NOT NULL,
  insight_type text NOT NULL,
  title text NOT NULL,
  message text,
  estimated_savings numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, DELETE ON public.meal_plan_ai_insights TO authenticated;
GRANT ALL ON public.meal_plan_ai_insights TO service_role;

ALTER TABLE public.meal_plan_ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own meal plan insights"
  ON public.meal_plan_ai_insights
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own meal plan insights"
  ON public.meal_plan_ai_insights
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages meal plan insights"
  ON public.meal_plan_ai_insights
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_meal_plan_ai_insights_user_plan
  ON public.meal_plan_ai_insights (user_id, meal_plan_id);
