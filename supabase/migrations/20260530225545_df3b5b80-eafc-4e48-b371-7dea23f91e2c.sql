
-- 1. Refactor has_admin_permission: replace dynamic SQL with static CASE lookup
CREATE OR REPLACE FUNCTION public.has_admin_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_owner_v boolean;
  has_perm boolean;
  perm_row public.admin_permissions%ROWTYPE;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'owner'::app_role
  ) INTO is_owner_v;

  IF is_owner_v THEN
    RETURN true;
  END IF;

  SELECT * INTO perm_row FROM public.admin_permissions WHERE user_id = _user_id LIMIT 1;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  has_perm := CASE _permission
    WHEN 'view_members' THEN perm_row.view_members
    WHEN 'edit_members' THEN perm_row.edit_members
    WHEN 'export_data' THEN perm_row.export_data
    WHEN 'view_snap_data' THEN perm_row.view_snap_data
    WHEN 'manage_recipes' THEN perm_row.manage_recipes
    WHEN 'manage_meal_plans' THEN perm_row.manage_meal_plans
    WHEN 'manage_special_meals' THEN perm_row.manage_special_meals
    WHEN 'manage_marketing' THEN perm_row.manage_marketing
    WHEN 'view_analytics' THEN perm_row.view_analytics
    WHEN 'invite_remove_admins' THEN perm_row.invite_remove_admins
    WHEN 'edit_settings' THEN perm_row.edit_settings
    ELSE false
  END;

  RETURN COALESCE(has_perm, false);
END;
$function$;

-- 2. Revoke EXECUTE on internal-only SECURITY DEFINER functions from anon/authenticated.
-- These are either trigger functions, RLS helpers (Postgres evaluates policies without
-- requiring caller EXECUTE), cron, or service-role-only queue helpers.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_admin_permission(uuid, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.purge_old_email_send_log() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated, PUBLIC;

-- Keep these callable by authenticated users (they validate auth.uid() internally):
--   public.create_support_ticket, public.deduct_snap_balance, public.increment_rate_limit
-- (no change needed)

-- 3. Remove user DELETE on verification-documents bucket so members cannot
-- delete a document after submitting it for admin review.
DROP POLICY IF EXISTS "Users can delete own verification documents" ON storage.objects;

-- 4. Tighten public INSERT policies on waitlist_signups and partnership_requests
-- (replace WITH CHECK (true) with basic non-empty / length-bounded validation).
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist_signups;
CREATE POLICY "Anyone can join waitlist"
ON public.waitlist_signups
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL
  AND length(email) BETWEEN 3 AND 320
  AND email LIKE '%@%.%'
  AND (name IS NULL OR length(name) <= 200)
  AND (zip_code IS NULL OR length(zip_code) <= 20)
  AND (referral_source IS NULL OR length(referral_source) <= 200)
);

DROP POLICY IF EXISTS "Anyone can submit partnership requests" ON public.partnership_requests;
CREATE POLICY "Anyone can submit partnership requests"
ON public.partnership_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL
  AND length(email) BETWEEN 3 AND 320
  AND email LIKE '%@%.%'
  AND name IS NOT NULL AND length(name) BETWEEN 1 AND 200
  AND message IS NOT NULL AND length(message) BETWEEN 1 AND 5000
  AND (organization IS NULL OR length(organization) <= 200)
  AND (website IS NULL OR length(website) <= 500)
  AND (request_type IS NULL OR length(request_type) <= 100)
);
