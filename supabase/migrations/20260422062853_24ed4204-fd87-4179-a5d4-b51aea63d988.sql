-- Phase 2: Onboarding repositioning fields
-- Adds tier (free_forever/standard), home_store (single store), cooking_confidence,
-- and SNAP tracker fields (collected later in Settings, but defined now).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS home_store TEXT,
  ADD COLUMN IF NOT EXISTS cooking_confidence TEXT,
  ADD COLUMN IF NOT EXISTS monthly_snap_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS snap_deposit_day INTEGER,
  ADD COLUMN IF NOT EXISTS show_snap_tracker BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS food_assistance_status TEXT;

-- Backfill tier from snap_status: existing SNAP users become free_forever
UPDATE public.profiles
SET tier = 'free_forever'
WHERE snap_status = true AND tier = 'standard';

-- Backfill home_store from existing preferred_stores[0] when present
UPDATE public.profiles
SET home_store = preferred_stores[1]
WHERE home_store IS NULL
  AND preferred_stores IS NOT NULL
  AND array_length(preferred_stores, 1) >= 1;

-- Backfill food_assistance_status from snap_status
UPDATE public.profiles
SET food_assistance_status = CASE
  WHEN snap_status = true THEN 'snap_wic'
  ELSE 'none'
END
WHERE food_assistance_status IS NULL;

-- Constrain values
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_tier_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_tier_check
  CHECK (tier IN ('standard', 'free_forever'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_food_assistance_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_food_assistance_check
  CHECK (food_assistance_status IS NULL OR food_assistance_status IN ('snap_wic', 'tight_budget', 'none'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_cooking_confidence_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_cooking_confidence_check
  CHECK (cooking_confidence IS NULL OR cooking_confidence IN ('beginner', 'intermediate', 'advanced'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_snap_deposit_day_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_snap_deposit_day_check
  CHECK (snap_deposit_day IS NULL OR (snap_deposit_day BETWEEN 1 AND 31));

CREATE INDEX IF NOT EXISTS idx_profiles_tier ON public.profiles(tier);
CREATE INDEX IF NOT EXISTS idx_profiles_home_store ON public.profiles(home_store);