-- Migration 1: Harden SECURITY DEFINER function execute privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

DO $$
DECLARE
  fn regprocedure;
  sig text;
BEGIN
  FOREACH sig IN ARRAY ARRAY[
    'public.has_role(uuid,public.app_role)',
    'public.is_admin(uuid)',
    'public.is_staff(uuid)',
    'public.has_admin_permission(uuid,text)',
    'public.handle_new_user()',
    'public.update_updated_at_column()',
    'public.assign_owner_role()',
    'public.enqueue_email(text,jsonb)',
    'public.read_email_batch(text,integer,integer)',
    'public.delete_email(text,bigint)',
    'public.move_to_dlq(text,text,bigint,jsonb)',
    'public.purge_old_email_send_log()',
    'public.increment_rate_limit(uuid,text,integer)',
    'public.deduct_snap_balance(uuid,numeric)',
    'public.create_support_ticket(text,text,text)',
    'public.lookup_ingredient_price(text)',
    'public.log_missing_ingredient(text,text,text)'
  ]
  LOOP
    fn := to_regprocedure(sig);
    IF fn IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, PUBLIC', fn);
    END IF;
  END LOOP;

  FOREACH sig IN ARRAY ARRAY[
    'public.handle_new_user()',
    'public.update_updated_at_column()',
    'public.assign_owner_role()',
    'public.purge_old_email_send_log()'
  ]
  LOOP
    fn := to_regprocedure(sig);
    IF fn IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', fn);
    END IF;
  END LOOP;

  FOREACH sig IN ARRAY ARRAY[
    'public.enqueue_email(text,jsonb)',
    'public.read_email_batch(text,integer,integer)',
    'public.delete_email(text,bigint)',
    'public.move_to_dlq(text,text,bigint,jsonb)',
    'public.increment_rate_limit(uuid,text,integer)'
  ]
  LOOP
    fn := to_regprocedure(sig);
    IF fn IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    END IF;
  END LOOP;

  FOREACH sig IN ARRAY ARRAY[
    'public.has_role(uuid,public.app_role)',
    'public.is_admin(uuid)',
    'public.is_staff(uuid)',
    'public.has_admin_permission(uuid,text)'
  ]
  LOOP
    fn := to_regprocedure(sig);
    IF fn IS NOT NULL THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn);
    END IF;
  END LOOP;

  FOREACH sig IN ARRAY ARRAY[
    'public.deduct_snap_balance(uuid,numeric)',
    'public.create_support_ticket(text,text,text)',
    'public.lookup_ingredient_price(text)',
    'public.log_missing_ingredient(text,text,text)'
  ]
  LOOP
    fn := to_regprocedure(sig);
    IF fn IS NOT NULL THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn);
    END IF;
  END LOOP;
END $$;

-- Migration 2: Allow authenticated users to insert their own activity logs
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