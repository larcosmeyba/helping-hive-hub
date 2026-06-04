
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS children_under_5 integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS children_5_to_12 integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS teenagers integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seniors_65_plus integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preferred_store_id text,
  ADD COLUMN IF NOT EXISTS assistance_food boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS assistance_snap boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS assistance_wic boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS assistance_diapers boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS assistance_housing boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS assistance_utilities boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS assistance_healthcare boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS assistance_employment boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS assistance_transportation boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS assistance_childcare boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS food_waste_alerts_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS food_waste_recipe_suggestions_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS plaid_interest text,
  ADD COLUMN IF NOT EXISTS goal_lose_weight boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS goal_build_muscle boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS goal_stay_active boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS goal_improve_mobility boolean DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_plaid_interest_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_plaid_interest_check
      CHECK (plaid_interest IS NULL OR plaid_interest IN ('yes','later','skip'));
  END IF;
END $$;
