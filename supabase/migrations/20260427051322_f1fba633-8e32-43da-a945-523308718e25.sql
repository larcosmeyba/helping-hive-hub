-- Add user_id to email_send_log so users can see/request deletion of their send history.
ALTER TABLE public.email_send_log
  ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE INDEX IF NOT EXISTS email_send_log_user_id_idx
  ON public.email_send_log (user_id);

CREATE INDEX IF NOT EXISTS email_send_log_created_at_idx
  ON public.email_send_log (created_at);

-- Owner-read policy: users can view their own send history.
DROP POLICY IF EXISTS "Users can view their own email send log" ON public.email_send_log;
CREATE POLICY "Users can view their own email send log"
  ON public.email_send_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all (for support/audit).
DROP POLICY IF EXISTS "Admins can view all email send log" ON public.email_send_log;
CREATE POLICY "Admins can view all email send log"
  ON public.email_send_log
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Retention: drop rows older than 90 days. Append-only audit, but PII shouldn't live forever.
CREATE OR REPLACE FUNCTION public.purge_old_email_send_log()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.email_send_log
  WHERE created_at < (now() - INTERVAL '90 days');
$$;

-- Schedule daily purge at 03:15 UTC (pg_cron is already enabled for the email queue).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('purge-email-send-log')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-email-send-log');
    PERFORM cron.schedule(
      'purge-email-send-log',
      '15 3 * * *',
      $cron$ SELECT public.purge_old_email_send_log(); $cron$
    );
  END IF;
END $$;