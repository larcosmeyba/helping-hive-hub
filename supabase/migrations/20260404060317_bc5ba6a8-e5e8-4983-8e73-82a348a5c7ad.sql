
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_source text,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS beta_user boolean NOT NULL DEFAULT true;
