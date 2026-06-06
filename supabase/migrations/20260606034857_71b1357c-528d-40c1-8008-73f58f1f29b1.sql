-- 1. Add new columns to recipes
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS meal_type text,
  ADD COLUMN IF NOT EXISTS estimated_recipe_cost numeric,
  ADD COLUMN IF NOT EXISTS cost_per_serving numeric,
  ADD COLUMN IF NOT EXISTS budget_tier text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'curated',
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS times_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_rating numeric;

DO $$ BEGIN
  ALTER TABLE public.recipes
    ADD CONSTRAINT recipes_meal_type_check
    CHECK (meal_type IS NULL OR meal_type IN ('breakfast','lunch','dinner','snack'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.recipes
    ADD CONSTRAINT recipes_budget_tier_check
    CHECK (budget_tier IS NULL OR budget_tier IN ('ultra_budget','budget','standard','premium'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.recipes
    ADD CONSTRAINT recipes_source_check
    CHECK (source IN ('curated','ai_generated'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_recipes_meal_type ON public.recipes (meal_type);
CREATE INDEX IF NOT EXISTS idx_recipes_budget_tier ON public.recipes (budget_tier);
CREATE INDEX IF NOT EXISTS idx_recipes_source ON public.recipes (source);

-- 2. Link meal_plan_meals -> recipes
ALTER TABLE public.meal_plan_meals
  ADD COLUMN IF NOT EXISTS recipe_id uuid;

CREATE INDEX IF NOT EXISTS idx_meal_plan_meals_recipe_id ON public.meal_plan_meals (recipe_id);

-- 3. recipe_usage table
CREATE TABLE IF NOT EXISTS public.recipe_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  meal_plan_id uuid,
  week_start date NOT NULL,
  meal_type text,
  cooked_at timestamptz,
  favorited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_usage TO authenticated;
GRANT ALL ON public.recipe_usage TO service_role;

ALTER TABLE public.recipe_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own recipe usage"
  ON public.recipe_usage FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all recipe usage"
  ON public.recipe_usage FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_recipe_usage_user_week ON public.recipe_usage (user_id, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_recipe_usage_recipe ON public.recipe_usage (recipe_id);

CREATE TRIGGER update_recipe_usage_updated_at
  BEFORE UPDATE ON public.recipe_usage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Helper: compute cost_per_serving + budget_tier whenever cost/serving changes
CREATE OR REPLACE FUNCTION public.recipes_compute_cost_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.estimated_recipe_cost IS NOT NULL AND NEW.serving_size IS NOT NULL AND NEW.serving_size > 0 THEN
    NEW.cost_per_serving := ROUND((NEW.estimated_recipe_cost / NEW.serving_size)::numeric, 2);
  END IF;

  IF NEW.cost_per_serving IS NOT NULL THEN
    NEW.budget_tier := CASE
      WHEN NEW.cost_per_serving <= 1.50 THEN 'ultra_budget'
      WHEN NEW.cost_per_serving <= 3.00 THEN 'budget'
      WHEN NEW.cost_per_serving <= 5.00 THEN 'standard'
      ELSE 'premium'
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recipes_compute_cost_fields_trg ON public.recipes;
CREATE TRIGGER recipes_compute_cost_fields_trg
  BEFORE INSERT OR UPDATE OF estimated_recipe_cost, serving_size, cost_per_serving
  ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.recipes_compute_cost_fields();

-- 5. Seed estimated_recipe_cost from existing cost_estimate where available, so the trigger fills tiers
UPDATE public.recipes
SET estimated_recipe_cost = cost_estimate
WHERE estimated_recipe_cost IS NULL AND cost_estimate IS NOT NULL AND cost_estimate > 0;