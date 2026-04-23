-- Helper that mirrors per-permission admin_permissions flags server-side.
-- Owners always pass; everyone else needs the explicit flag in admin_permissions.
CREATE OR REPLACE FUNCTION public.has_admin_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_owner boolean;
  has_perm boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'owner'::app_role
  ) INTO is_owner;

  IF is_owner THEN
    RETURN true;
  END IF;

  EXECUTE format(
    'SELECT COALESCE((SELECT %I FROM public.admin_permissions WHERE user_id = $1 LIMIT 1), false)',
    _permission
  )
  INTO has_perm
  USING _user_id;

  RETURN COALESCE(has_perm, false);
END;
$$;

-- Tighten the admin UPDATE policy on profiles so it requires the edit_members flag,
-- not merely "is an admin". This mirrors the UI gate in AdminMembers.tsx.
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins with edit_members can update profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'edit_members'));