
-- 1. Realtime: restrict topic subscriptions on notifications channel to owner
DROP POLICY IF EXISTS "Users can subscribe to own notification channel" ON realtime.messages;
CREATE POLICY "Users can subscribe to own notification channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'notifications:%'
      THEN realtime.topic() = 'notifications:' || auth.uid()::text
    ELSE true
  END
);

-- 2. recipe-images: explicit public SELECT
DROP POLICY IF EXISTS "Public can read recipe-images" ON storage.objects;
CREATE POLICY "Public can read recipe-images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'recipe-images');

-- 3. support-attachments: allow user UPDATE on own folder
DROP POLICY IF EXISTS "Users can update own support attachments" ON storage.objects;
CREATE POLICY "Users can update own support attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'support-attachments' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'support-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4. verification-documents: allow user DELETE on own folder
DROP POLICY IF EXISTS "Users can delete own verification documents" ON storage.objects;
CREATE POLICY "Users can delete own verification documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'verification-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 5. Lock down SECURITY DEFINER functions: revoke from PUBLIC/anon and from authenticated where not needed
-- Internal/cron/trigger-only functions — revoke from everyone except service_role
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purge_old_email_send_log() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_rate_limit(uuid, text, integer) FROM PUBLIC, anon, authenticated;

-- RLS-helper functions — keep authenticated EXECUTE (needed in policies), revoke anon/public
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.has_admin_permission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_admin_permission(uuid, text) TO authenticated;

-- Client-callable RPCs — keep authenticated
REVOKE ALL ON FUNCTION public.deduct_snap_balance(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deduct_snap_balance(uuid, numeric) TO authenticated;
REVOKE ALL ON FUNCTION public.create_support_ticket(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_support_ticket(text, text, text) TO authenticated;
