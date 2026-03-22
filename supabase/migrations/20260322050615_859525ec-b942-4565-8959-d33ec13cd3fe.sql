
-- Create storage bucket for marketing images
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketing-assets', 'marketing-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow admins to upload marketing assets
CREATE POLICY "Admins can upload marketing assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'marketing-assets' AND
  public.is_admin(auth.uid())
);

CREATE POLICY "Admins can update marketing assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'marketing-assets' AND
  public.is_admin(auth.uid())
);

CREATE POLICY "Admins can delete marketing assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'marketing-assets' AND
  public.is_admin(auth.uid())
);

CREATE POLICY "Anyone can view marketing assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'marketing-assets');
