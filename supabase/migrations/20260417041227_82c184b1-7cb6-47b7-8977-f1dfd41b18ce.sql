-- Drop any existing broad SELECT policies on storage.objects for our public buckets
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname IN (
        'Public read marketing-assets',
        'Public read brand-assets',
        'Public read recipe-images',
        'Marketing assets are publicly accessible',
        'Brand assets are publicly accessible',
        'Recipe images are publicly accessible'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Admins can list/manage files in these buckets
CREATE POLICY "Admins can list marketing-assets"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'marketing-assets' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can list brand-assets"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'brand-assets' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can list recipe-images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'recipe-images' AND public.is_admin(auth.uid()));

-- Note: buckets remain `public = true`, so files are still served via direct CDN URLs.
-- We are only removing the *anonymous LIST* permission, not the file-read permission.