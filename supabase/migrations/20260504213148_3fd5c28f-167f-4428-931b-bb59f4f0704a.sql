
CREATE TABLE public.waitlist_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  zip_code text,
  referral_source text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join waitlist" ON public.waitlist_signups
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins can view waitlist" ON public.waitlist_signups
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));
