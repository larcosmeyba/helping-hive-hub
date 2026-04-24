
-- support_tickets: authenticated insert + admin/owner select
DROP POLICY IF EXISTS "Anyone can submit support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Authenticated users can submit support tickets" ON public.support_tickets;
CREATE POLICY "Authenticated users can submit support tickets"
ON public.support_tickets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view support tickets" ON public.support_tickets;
CREATE POLICY "Admins can view support tickets"
ON public.support_tickets
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view own support tickets" ON public.support_tickets;
CREATE POLICY "Users can view own support tickets"
ON public.support_tickets
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Storage: owner-only delete on private buckets
DROP POLICY IF EXISTS "Users can delete own support attachments" ON storage.objects;
CREATE POLICY "Users can delete own support attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'support-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete own verification documents" ON storage.objects;
CREATE POLICY "Users can delete own verification documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'verification-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
