
CREATE OR REPLACE FUNCTION public.log_missing_ingredient(
  _name text,
  _store_code text DEFAULT NULL,
  _state_code text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  norm text := lower(trim(_name));
  uid uuid := auth.uid();
  rl record;
BEGIN
  -- Require authentication
  IF uid IS NULL THEN RETURN; END IF;
  -- Reject empty / unreasonably long input
  IF norm IS NULL OR length(norm) = 0 OR length(norm) > 200 THEN RETURN; END IF;

  -- Rate limit: 60 calls per hour per user
  SELECT * INTO rl FROM public.increment_rate_limit(uid, 'log_missing_ingredient', 60);
  IF NOT rl.allowed THEN RETURN; END IF;

  INSERT INTO public.missing_ingredient_log
    (ingredient_name, normalized_name, last_store_code, last_state_code, last_user_id)
  VALUES (left(_name, 200), norm, left(_store_code, 32), left(_state_code, 8), uid)
  ON CONFLICT (normalized_name) DO UPDATE
  SET occurrence_count = public.missing_ingredient_log.occurrence_count + 1,
      last_seen_at = now(),
      last_store_code = COALESCE(EXCLUDED.last_store_code, public.missing_ingredient_log.last_store_code),
      last_state_code = COALESCE(EXCLUDED.last_state_code, public.missing_ingredient_log.last_state_code),
      last_user_id    = COALESCE(EXCLUDED.last_user_id, public.missing_ingredient_log.last_user_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_missing_ingredient(text, text, text) FROM anon, PUBLIC;
