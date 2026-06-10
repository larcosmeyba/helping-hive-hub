CREATE INDEX IF NOT EXISTS idx_pantry_items_user_expiration
  ON public.pantry_items (user_id, expiration_date NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_meal_plans_user_created
  ON public.meal_plans (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_grocery_lists_user_status_created
  ON public.grocery_lists (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_meal_plan_generation_jobs_user_created
  ON public.meal_plan_generation_jobs (user_id, created_at DESC);

ANALYZE public.pantry_items;
ANALYZE public.meal_plans;
ANALYZE public.grocery_lists;
ANALYZE public.meal_plan_generation_jobs;