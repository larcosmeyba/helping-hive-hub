-- 1. Add opt-in columns to profiles (default true = current behavior)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS data_usage_opt_in BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS analytics_opt_in BOOLEAN NOT NULL DEFAULT true;

-- 2. Audit table for account deletions (compliance trail)
CREATE TABLE IF NOT EXISTS public.account_deletions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT,
  initiated_by TEXT NOT NULL DEFAULT 'self'
);

ALTER TABLE public.account_deletions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can record their own deletion"
  ON public.account_deletions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view deletion log"
  ON public.account_deletions FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));