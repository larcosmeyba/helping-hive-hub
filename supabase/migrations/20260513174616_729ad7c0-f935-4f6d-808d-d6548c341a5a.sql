
-- Categories
CREATE TABLE public.resource_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.resource_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view categories" ON public.resource_categories FOR SELECT USING (true);
CREATE POLICY "Admins manage categories" ON public.resource_categories FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Resources
CREATE TABLE public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_slug text NOT NULL REFERENCES public.resource_categories(slug) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  city text,
  state text,
  zip_code text,
  latitude double precision,
  longitude double precision,
  phone text,
  website text,
  hours jsonb DEFAULT '{}'::jsonb,
  tags text[] DEFAULT '{}'::text[],
  about text,
  eligibility text,
  what_to_bring text,
  image_url text,
  is_national boolean NOT NULL DEFAULT false,
  verified boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_resources_category ON public.resources(category_slug);
CREATE INDEX idx_resources_zip ON public.resources(zip_code);
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authed can view verified resources" ON public.resources FOR SELECT TO authenticated
  USING (verified = true);
CREATE POLICY "Admins manage resources" ON public.resources FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE TRIGGER trg_resources_updated BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Saved
CREATE TABLE public.saved_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, resource_id)
);
ALTER TABLE public.saved_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved resources" ON public.saved_resources FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Seed categories
INSERT INTO public.resource_categories (slug, title, description, icon, sort_order) VALUES
  ('food-bank', 'Food Bank Resources', 'Find food banks & pantries near you', 'Utensils', 1),
  ('diapers-formula-clothing', 'Diapers, Formula & Clothing', 'Find baby items & clothing help', 'Baby', 2),
  ('clean-water', 'Clean Water Resources', 'Find clean water & refill stations', 'Droplets', 3),
  ('housing-shelter', 'Housing / Shelter Resources', 'Find housing and shelter help', 'Home', 4),
  ('snap-wic', 'SNAP / WIC Assistance', 'Get help with food benefits', 'CreditCard', 5),
  ('utility', 'Utility Assistance', 'Help with gas, electric, water & internet', 'Zap', 6),
  ('free-meals', 'Free / Low-Cost Meals', 'Free community meals near you', 'Soup', 7),
  ('healthcare', 'Healthcare & Clinics', 'Find free & low-cost healthcare', 'Stethoscope', 8),
  ('mental-health', 'Mental Health Support', 'Resources & hotlines in your area', 'HeartHandshake', 9),
  ('employment', 'Employment Help', 'Job centers, training & support', 'Briefcase', 10),
  ('transportation', 'Transportation Assistance', 'Find rides, bus passes & local options', 'Bus', 11),
  ('student-family', 'Student & Family Resources', 'School supplies, child care & more', 'GraduationCap', 12),
  ('senior', 'Senior Resources', 'Meals, care, discounts & support', 'Users', 13),
  ('emergency', 'Emergency Help', 'Crisis lines & urgent resources', 'Siren', 14);

-- Seed national fallback resources (always available)
INSERT INTO public.resources (category_slug, name, phone, website, about, is_national, tags, hours) VALUES
  ('emergency', '211 — United Way Helpline', '211', 'https://www.211.org', 'Free, confidential 24/7 helpline that connects you to local resources for food, housing, utility help, mental health, and more.', true, ARRAY['Crisis','Hotline','24/7'], '{"all":"24/7"}'::jsonb),
  ('snap-wic', 'SNAP Office Locator (USDA)', NULL, 'https://www.fns.usda.gov/snap/state-directory', 'Find your state SNAP office to apply for food assistance benefits.', true, ARRAY['SNAP','Application'], '{}'::jsonb),
  ('snap-wic', 'WIC Office Locator (USDA)', NULL, 'https://www.fns.usda.gov/wic/wic-how-apply', 'Find your local WIC office for nutrition support for women, infants, and children.', true, ARRAY['WIC','Family','Infant'], '{}'::jsonb),
  ('food-bank', 'Feeding America Food Bank Finder', NULL, 'https://www.feedingamerica.org/find-your-local-foodbank', 'Find your nearest food bank in the Feeding America national network.', true, ARRAY['Food Pantry','Groceries'], '{}'::jsonb),
  ('mental-health', '988 Suicide & Crisis Lifeline', '988', 'https://988lifeline.org', 'Free 24/7 confidential support for people in distress, plus prevention and crisis resources.', true, ARRAY['Crisis','Hotline','24/7'], '{"all":"24/7"}'::jsonb),
  ('utility', 'LIHEAP — Home Energy Assistance', NULL, 'https://liheapch.acf.hhs.gov/help', 'Federal Low Income Home Energy Assistance Program — help with heating and cooling bills.', true, ARRAY['Utility','Energy'], '{}'::jsonb),
  ('housing-shelter', 'HUD Find Shelter Tool', NULL, 'https://www.hud.gov/findshelter', 'Search HUD''s national database for emergency shelter, housing, and food near you.', true, ARRAY['Shelter','Housing'], '{}'::jsonb),
  ('healthcare', 'HRSA Find a Health Center', NULL, 'https://findahealthcenter.hrsa.gov', 'Find federally funded community health centers offering sliding-scale care.', true, ARRAY['Clinic','Healthcare'], '{}'::jsonb);
