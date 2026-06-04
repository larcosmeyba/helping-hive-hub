
-- HIVE AI
CREATE TABLE IF NOT EXISTS public.inventory_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  image_url text NOT NULL,
  scan_type text NOT NULL DEFAULT 'pantry',
  ai_processed boolean NOT NULL DEFAULT false,
  detected_items_json jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_photos TO authenticated;
GRANT ALL ON public.inventory_photos TO service_role;
ALTER TABLE public.inventory_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own inventory photos" ON public.inventory_photos;
CREATE POLICY "Users manage own inventory photos" ON public.inventory_photos
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.food_waste_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  pantry_item_id uuid,
  alert_type text NOT NULL,
  days_until_expiration integer,
  estimated_value numeric,
  message text,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_food_waste_alerts_user ON public.food_waste_alerts(user_id, resolved);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_waste_alerts TO authenticated;
GRANT ALL ON public.food_waste_alerts TO service_role;
ALTER TABLE public.food_waste_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own food waste alerts" ON public.food_waste_alerts;
CREATE POLICY "Users manage own food waste alerts" ON public.food_waste_alerts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- FAMILY ASSISTANCE
CREATE TABLE IF NOT EXISTS public.family_assistance_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  zip_code text,
  household_size integer,
  children_under_5 integer DEFAULT 0,
  children_5_to_12 integer DEFAULT 0,
  teenagers integer DEFAULT 0,
  seniors_65_plus integer DEFAULT 0,
  employment_status text,
  lost_job_recently boolean DEFAULT false,
  reduced_hours_recently boolean DEFAULT false,
  monthly_income_range text,
  currently_receiving_snap boolean DEFAULT false,
  currently_receiving_wic boolean DEFAULT false,
  currently_receiving_medicaid boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_assistance_profiles TO authenticated;
GRANT ALL ON public.family_assistance_profiles TO service_role;
ALTER TABLE public.family_assistance_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own family profile" ON public.family_assistance_profiles;
CREATE POLICY "Users manage own family profile" ON public.family_assistance_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS update_family_assistance_profiles_updated_at ON public.family_assistance_profiles;
CREATE TRIGGER update_family_assistance_profiles_updated_at
  BEFORE UPDATE ON public.family_assistance_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.assistance_needs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  needs_food_assistance boolean DEFAULT false,
  needs_snap boolean DEFAULT false,
  needs_wic boolean DEFAULT false,
  needs_diapers_formula boolean DEFAULT false,
  needs_housing boolean DEFAULT false,
  needs_utilities boolean DEFAULT false,
  needs_healthcare boolean DEFAULT false,
  needs_transportation boolean DEFAULT false,
  needs_childcare boolean DEFAULT false,
  needs_employment boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistance_needs TO authenticated;
GRANT ALL ON public.assistance_needs TO service_role;
ALTER TABLE public.assistance_needs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own assistance needs" ON public.assistance_needs;
CREATE POLICY "Users manage own assistance needs" ON public.assistance_needs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS update_assistance_needs_updated_at ON public.assistance_needs;
CREATE TRIGGER update_assistance_needs_updated_at
  BEFORE UPDATE ON public.assistance_needs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.local_resources (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_name text NOT NULL,
  category text NOT NULL,
  description text,
  address text,
  city text,
  state text,
  zip_code text,
  phone text,
  website_url text,
  application_url text,
  hours text,
  eligibility_notes text,
  documents_needed text[] DEFAULT '{}'::text[],
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_local_resources_zip_cat ON public.local_resources(zip_code, category);
GRANT SELECT ON public.local_resources TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.local_resources TO authenticated;
GRANT ALL ON public.local_resources TO service_role;
ALTER TABLE public.local_resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view local resources" ON public.local_resources;
CREATE POLICY "Anyone can view local resources" ON public.local_resources FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage local resources" ON public.local_resources;
CREATE POLICY "Admins can manage local resources" ON public.local_resources
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
DROP TRIGGER IF EXISTS update_local_resources_updated_at ON public.local_resources;
CREATE TRIGGER update_local_resources_updated_at
  BEFORE UPDATE ON public.local_resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extend existing saved_resources
ALTER TABLE public.saved_resources
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'saved',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
DROP TRIGGER IF EXISTS update_saved_resources_updated_at ON public.saved_resources;
CREATE TRIGGER update_saved_resources_updated_at
  BEFORE UPDATE ON public.saved_resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
