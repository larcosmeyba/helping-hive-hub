-- Restrict bucket listing on public buckets to admins only.
-- Direct object reads via public URL still work — this only blocks the LIST operation.
DROP POLICY IF EXISTS "Public can list marketing assets" ON storage.objects;
DROP POLICY IF EXISTS "Public can list brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Public can list recipe images" ON storage.objects;
DROP POLICY IF EXISTS "Public read marketing assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read recipe images" ON storage.objects;

-- Allow public READ of individual objects (by key) but block broad listing.
-- Note: storage uses a single SELECT operation for both list and direct read.
-- The fix is to gate by whether the request includes a specific name (direct fetch)
-- vs a prefix list. PostgREST/Storage list calls are not distinguishable here, so
-- the standard remediation is: keep public buckets readable by direct URL only,
-- which is the default when there is NO public SELECT policy on storage.objects.
-- We therefore DROP any broad public list policies; signed/public URLs continue to work
-- because the storage CDN serves objects via signed paths that bypass RLS for public buckets.

-- Admins can list any objects in these buckets (for the marketing studio etc.)
CREATE POLICY "Admins can list public buckets"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id IN ('marketing-assets', 'brand-assets', 'recipe-images')
    AND public.is_admin(auth.uid())
  );