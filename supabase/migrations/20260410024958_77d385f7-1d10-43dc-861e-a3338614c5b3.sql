
CREATE TABLE public.grocery_cost_comparisons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  meal_plan_id UUID REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  zip_code TEXT,
  selected_store TEXT,
  actual_grocery_cost NUMERIC NOT NULL DEFAULT 0,
  regional_average_cost NUMERIC NOT NULL DEFAULT 0,
  estimated_savings NUMERIC NOT NULL DEFAULT 0,
  confidence_score NUMERIC DEFAULT 0,
  store_comparisons JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.grocery_cost_comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own savings" ON public.grocery_cost_comparisons
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own savings" ON public.grocery_cost_comparisons
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all savings" ON public.grocery_cost_comparisons
  FOR SELECT USING (is_admin(auth.uid()));

CREATE INDEX idx_grocery_cost_comparisons_user ON public.grocery_cost_comparisons(user_id);
CREATE INDEX idx_grocery_cost_comparisons_plan ON public.grocery_cost_comparisons(meal_plan_id);
