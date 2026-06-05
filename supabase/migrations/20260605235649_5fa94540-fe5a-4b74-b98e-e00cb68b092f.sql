
-- family_assistance_requests
CREATE TABLE public.family_assistance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  zip_code text,
  selected_categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  urgency_level text NOT NULL DEFAULT 'normal',
  household_size integer,
  has_children boolean,
  employment_status text,
  receives_benefits text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_assistance_requests TO authenticated;
GRANT ALL ON public.family_assistance_requests TO service_role;
ALTER TABLE public.family_assistance_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own family requests" ON public.family_assistance_requests
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all family requests" ON public.family_assistance_requests
  FOR SELECT USING (is_admin(auth.uid()));
CREATE TRIGGER trg_far_updated BEFORE UPDATE ON public.family_assistance_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- community_resources
CREATE TABLE public.community_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  subcategory text,
  description text,
  address text,
  city text,
  state text,
  zip_code text,
  county text,
  latitude numeric,
  longitude numeric,
  phone text,
  website text,
  email text,
  hours text,
  eligibility_notes text,
  what_to_bring text,
  emergency_available boolean NOT NULL DEFAULT false,
  source text,
  last_verified_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.community_resources TO authenticated;
GRANT ALL ON public.community_resources TO service_role;
ALTER TABLE public.community_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view community resources" ON public.community_resources
  FOR SELECT TO authenticated USING (active = true OR is_admin(auth.uid()));
CREATE POLICY "Admins manage community resources" ON public.community_resources
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE INDEX idx_community_resources_cat_zip ON public.community_resources (category, zip_code);
CREATE TRIGGER trg_cr_updated BEFORE UPDATE ON public.community_resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- saved_family_resources
CREATE TABLE public.saved_family_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resource_id uuid NOT NULL REFERENCES public.community_resources(id) ON DELETE CASCADE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, resource_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_family_resources TO authenticated;
GRANT ALL ON public.saved_family_resources TO service_role;
ALTER TABLE public.saved_family_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved family resources" ON public.saved_family_resources
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- family_assistance_ai_recommendations
CREATE TABLE public.family_assistance_ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  request_id uuid REFERENCES public.family_assistance_requests(id) ON DELETE CASCADE,
  recommended_resource_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_summary text,
  urgent_notes text,
  next_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_assistance_ai_recommendations TO authenticated;
GRANT ALL ON public.family_assistance_ai_recommendations TO service_role;
ALTER TABLE public.family_assistance_ai_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own family ai recs" ON public.family_assistance_ai_recommendations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
