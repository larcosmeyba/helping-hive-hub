-- Per-user, per-endpoint, per-hour rate limit counters
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  hour_bucket TIMESTAMPTZ NOT NULL,
  call_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, endpoint, hour_bucket)
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_bucket
  ON public.api_rate_limits(hour_bucket);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users view own rate limits"
    ON public.api_rate_limits FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages rate limits"
    ON public.api_rate_limits FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Atomically increment the counter for the current hour and return whether
-- the caller has exceeded the per-hour limit. Service-role only execution.
CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  _user_id UUID,
  _endpoint TEXT,
  _max_per_hour INTEGER
)
RETURNS TABLE(allowed BOOLEAN, current_count INTEGER, limit_per_hour INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bucket TIMESTAMPTZ := date_trunc('hour', now());
  new_count INTEGER;
BEGIN
  INSERT INTO public.api_rate_limits AS rl (user_id, endpoint, hour_bucket, call_count, updated_at)
  VALUES (_user_id, _endpoint, bucket, 1, now())
  ON CONFLICT (user_id, endpoint, hour_bucket)
  DO UPDATE SET
    call_count = rl.call_count + 1,
    updated_at = now()
  RETURNING rl.call_count INTO new_count;

  RETURN QUERY SELECT (new_count <= _max_per_hour) AS allowed, new_count, _max_per_hour;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_rate_limit(UUID, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_rate_limit(UUID, TEXT, INTEGER) TO service_role;