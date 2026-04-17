-- Add tag-based filtering and extra nutrition fields to recipes
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS fiber_g NUMERIC,
  ADD COLUMN IF NOT EXISTS prep_time_minutes INTEGER;

CREATE INDEX IF NOT EXISTS idx_recipes_tags ON public.recipes USING GIN (tags);

-- Create public bucket for recipe images extracted from PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-images', 'recipe-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for recipe images
CREATE POLICY "Recipe images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'recipe-images');

-- Only admins can upload, update, delete
CREATE POLICY "Admins can upload recipe images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'recipe-images' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update recipe images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'recipe-images' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete recipe images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'recipe-images' AND public.is_admin(auth.uid()));