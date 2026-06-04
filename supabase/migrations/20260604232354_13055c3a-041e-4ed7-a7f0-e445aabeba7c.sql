
DROP POLICY IF EXISTS "Users read own inventory photos" ON storage.objects;
CREATE POLICY "Users read own inventory photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'inventory-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users upload own inventory photos" ON storage.objects;
CREATE POLICY "Users upload own inventory photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'inventory-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users delete own inventory photos" ON storage.objects;
CREATE POLICY "Users delete own inventory photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'inventory-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
