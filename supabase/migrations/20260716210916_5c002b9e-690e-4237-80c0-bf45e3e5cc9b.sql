GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plans TO authenticated;
GRANT ALL ON public.meal_plans TO service_role;

DO $$
BEGIN
  IF to_regclass('public.meal_plan_items') IS NOT NULL THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plan_items TO authenticated;
    GRANT ALL ON public.meal_plan_items TO service_role;
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grocery_lists TO authenticated;
GRANT ALL ON public.grocery_lists TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grocery_list_items TO authenticated;
GRANT ALL ON public.grocery_list_items TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pantry_items TO authenticated;
GRANT ALL ON public.pantry_items TO service_role;

GRANT SELECT ON public.recipes TO anon, authenticated;
GRANT ALL ON public.recipes TO service_role;