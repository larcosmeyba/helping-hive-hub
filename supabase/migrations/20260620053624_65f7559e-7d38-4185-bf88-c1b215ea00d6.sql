ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS disliked_foods text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS kid_friendly boolean,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sodium_mg numeric;

UPDATE public.recipes
SET kid_friendly = (
  (COALESCE(tags, ARRAY[]::text[]) && ARRAY['kid-friendly','family-friendly','kids'])
  OR lower(coalesce(title,'')) ~ '(mac.?cheese|chicken nugget|spaghetti|pancake|quesadilla|grilled cheese|pizza)'
)
WHERE kid_friendly IS NULL;

ALTER TABLE public.meal_plan_meals
  ADD COLUMN IF NOT EXISTS carbs_estimate numeric,
  ADD COLUMN IF NOT EXISTS fats_estimate numeric,
  ADD COLUMN IF NOT EXISTS fiber_estimate numeric,
  ADD COLUMN IF NOT EXISTS sodium_estimate numeric;