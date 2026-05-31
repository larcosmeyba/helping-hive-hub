-- #6: Switch admin RLS from is_admin to has_admin_permission for granular control
-- profiles SELECT
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins with view_members can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (has_admin_permission(auth.uid(), 'view_members'));

-- marketing_campaigns
DROP POLICY IF EXISTS "Admins can manage campaigns" ON public.marketing_campaigns;
DROP POLICY IF EXISTS "Admins can view campaigns" ON public.marketing_campaigns;
CREATE POLICY "Admins with manage_marketing can view campaigns"
ON public.marketing_campaigns FOR SELECT TO authenticated
USING (has_admin_permission(auth.uid(), 'manage_marketing'));
CREATE POLICY "Admins with manage_marketing can manage campaigns"
ON public.marketing_campaigns FOR ALL TO authenticated
USING (has_admin_permission(auth.uid(), 'manage_marketing'))
WITH CHECK (has_admin_permission(auth.uid(), 'manage_marketing'));

-- #7: Add WITH CHECK on admin UPDATE policies for verification_documents and user_feedback
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='verification_documents' AND policyname='Admins can update verification documents') THEN
    EXECUTE 'DROP POLICY "Admins can update verification documents" ON public.verification_documents';
    EXECUTE 'CREATE POLICY "Admins can update verification documents" ON public.verification_documents FOR UPDATE TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()))';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_feedback' AND policyname='Admins can update user feedback') THEN
    EXECUTE 'DROP POLICY "Admins can update user feedback" ON public.user_feedback';
    EXECUTE 'CREATE POLICY "Admins can update user feedback" ON public.user_feedback FOR UPDATE TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()))';
  END IF;
END $$;

-- #8: Revoke anon/authenticated direct access on instacart_access_tokens (service_role only)
REVOKE ALL ON public.instacart_access_tokens FROM anon, authenticated;

-- #13: Add WITH CHECK on notifications UPDATE policy (defense-in-depth)
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- special_meal_collections — switch to manage_special_meals if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='special_meal_collections') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage special meal collections" ON public.special_meal_collections';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can view special meal collections" ON public.special_meal_collections';
    EXECUTE 'CREATE POLICY "Admins with manage_special_meals can view" ON public.special_meal_collections FOR SELECT TO authenticated USING (has_admin_permission(auth.uid(), ''manage_special_meals''))';
    EXECUTE 'CREATE POLICY "Admins with manage_special_meals can manage" ON public.special_meal_collections FOR ALL TO authenticated USING (has_admin_permission(auth.uid(), ''manage_special_meals'')) WITH CHECK (has_admin_permission(auth.uid(), ''manage_special_meals''))';
  END IF;
END $$;