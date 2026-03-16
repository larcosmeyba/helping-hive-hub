
-- Allow admins to insert, update, delete recipes
CREATE POLICY "Admins can insert recipes" ON public.recipes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update recipes" ON public.recipes
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete recipes" ON public.recipes
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Allow admins to view all meal plans and items
CREATE POLICY "Admins can view all meal plans" ON public.meal_plans
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view all meal plan items" ON public.meal_plan_items
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
