-- Client analytics writes to activity_logs after sign-in. Keep reads admin-only,
-- but allow signed-in users to append their own activity rows.

GRANT INSERT ON public.activity_logs TO authenticated;

DROP POLICY IF EXISTS "Admins can insert activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Authenticated can insert activity logs" ON public.activity_logs;

CREATE POLICY "Authenticated can insert activity logs"
  ON public.activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      user_id = (SELECT auth.uid())
      OR public.is_admin((SELECT auth.uid()))
    )
    AND length(action) BETWEEN 1 AND 120
    AND (entity_type IS NULL OR length(entity_type) <= 80)
    AND (entity_id IS NULL OR length(entity_id) <= 120)
  );
