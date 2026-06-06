DO $$ BEGIN
  CREATE POLICY "Users can update own inventory photos"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
      bucket_id = 'inventory-photos'
      AND (auth.uid())::text = (storage.foldername(name))[1]
    )
    WITH CHECK (
      bucket_id = 'inventory-photos'
      AND (auth.uid())::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;