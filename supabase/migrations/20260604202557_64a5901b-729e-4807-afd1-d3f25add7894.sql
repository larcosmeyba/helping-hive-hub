
-- PART 1: extend grocery_list_items
ALTER TABLE public.grocery_list_items
  ADD COLUMN IF NOT EXISTS recipe_id UUID,
  ADD COLUMN IF NOT EXISTS normalized_item_name TEXT,
  ADD COLUMN IF NOT EXISTS checked BOOLEAN NOT NULL DEFAULT false;

-- PART 1: extend pantry_items
ALTER TABLE public.pantry_items
  ADD COLUMN IF NOT EXISTS normalized_item_name TEXT;

-- PART 2: generated_recipes
CREATE TABLE IF NOT EXISTS public.generated_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'cook_from_what_i_have',
  recipe_name TEXT NOT NULL,
  description TEXT,
  servings INTEGER,
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  difficulty TEXT,
  estimated_cost_of_missing_items NUMERIC,
  savings_estimate NUMERIC,
  food_waste_reason TEXT,
  instructions JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'suggested',
  cooked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.generated_recipes TO authenticated;
GRANT ALL ON public.generated_recipes TO service_role;

ALTER TABLE public.generated_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own generated recipes"
  ON public.generated_recipes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_generated_recipes_user ON public.generated_recipes(user_id, created_at DESC);

CREATE TRIGGER update_generated_recipes_updated_at
  BEFORE UPDATE ON public.generated_recipes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PART 2: generated_recipe_ingredients
CREATE TABLE IF NOT EXISTS public.generated_recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.generated_recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  normalized_item_name TEXT,
  quantity TEXT,
  unit TEXT,
  already_have BOOLEAN NOT NULL DEFAULT false,
  source_location TEXT,
  pantry_item_id UUID,
  estimated_price NUMERIC,
  instacart_search_term TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.generated_recipe_ingredients TO authenticated;
GRANT ALL ON public.generated_recipe_ingredients TO service_role;

ALTER TABLE public.generated_recipe_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own generated recipe ingredients"
  ON public.generated_recipe_ingredients
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_gen_recipe_ing_recipe ON public.generated_recipe_ingredients(recipe_id);
