CREATE TABLE public.partnership_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type text NOT NULL CHECK (request_type IN ('partnership', 'press', 'affiliate')),
  name text NOT NULL,
  email text NOT NULL,
  organization text NOT NULL,
  website text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'replied', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.partnership_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit partnership requests"
  ON public.partnership_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read partnership requests"
  ON public.partnership_requests
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update partnership requests"
  ON public.partnership_requests
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX idx_partnership_requests_status ON public.partnership_requests(status);
CREATE INDEX idx_partnership_requests_created ON public.partnership_requests(created_at DESC);