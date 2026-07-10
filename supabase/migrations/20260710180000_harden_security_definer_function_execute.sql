-- Supabase Security Advisor 0028:
-- SECURITY DEFINER functions must not be executable by anon/PUBLIC unless
-- they are deliberately public. These helpers either back RLS, triggers, cron,
-- or authenticated/service-role RPCs, so public execution is not required.

-- Future functions created by the migration owner should not be executable by
-- PUBLIC by default. Existing functions are handled explicitly below.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

DO $$
DECLARE
  fn regprocedure;
  sig text;
BEGIN
  -- Revoke anonymous/public execution from every known SECURITY DEFINER
  -- function in the public schema. to_regprocedure() keeps this migration
  -- safe across environments where some legacy functions were already dropped.
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

  -- Trigger/cron/internal functions should not be directly callable by
  -- authenticated clients.
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

  -- Service-role queue/rate-limit helpers are called by Edge Functions only.
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

  -- RLS/admin helper functions are used by policies and admin Edge Functions.
  -- Keep authenticated and service_role access; anon remains revoked.
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

  -- Client-callable RPCs require a signed-in user and validate ownership or
  -- auth.uid() internally. Service-role access is retained for Edge Functions.
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
