
-- Enable fuzzy matching for ingredient lookups
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index existing pricing tables for fast case-insensitive + fuzzy lookups
CREATE INDEX IF NOT EXISTS grocery_price_reference_key_trgm_idx
  ON public.grocery_price_reference USING gin (lower(ingredient_key) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS grocery_price_reference_display_trgm_idx
  ON public.grocery_price_reference USING gin (lower(display_name) gin_trgm_ops);
CREATE UNIQUE INDEX IF NOT EXISTS grocery_price_reference_key_unique
  ON public.grocery_price_reference (lower(ingredient_key));

CREATE UNIQUE INDEX IF NOT EXISTS store_price_multipliers_code_unique
  ON public.store_price_multipliers (lower(store_code));
CREATE UNIQUE INDEX IF NOT EXISTS state_price_multipliers_code_unique
  ON public.state_price_multipliers (lower(state_code));

-- Track ingredients we couldn't price so we can expand the database
CREATE TABLE IF NOT EXISTS public.missing_ingredient_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_name text NOT NULL,
  normalized_name text NOT NULL,
  occurrence_count integer NOT NULL DEFAULT 1,
  last_store_code text,
  last_state_code text,
  last_user_id uuid,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS missing_ingredient_log_norm_unique
  ON public.missing_ingredient_log (normalized_name);

GRANT SELECT, INSERT, UPDATE ON public.missing_ingredient_log TO authenticated;
GRANT ALL ON public.missing_ingredient_log TO service_role;

ALTER TABLE public.missing_ingredient_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read missing ingredient log"
  ON public.missing_ingredient_log FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated can log missing ingredients"
  ON public.missing_ingredient_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can bump occurrence count"
  ON public.missing_ingredient_log FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Fuzzy ingredient lookup (case-insensitive + trigram similarity)
CREATE OR REPLACE FUNCTION public.lookup_ingredient_price(_query text)
RETURNS TABLE (
  id uuid,
  ingredient_key text,
  display_name text,
  category text,
  unit text,
  avg_price numeric,
  low_price numeric,
  high_price numeric,
  similarity real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH q AS (SELECT lower(trim(_query)) AS needle)
  SELECT g.id, g.ingredient_key, g.display_name, g.category, g.unit,
         g.avg_price, g.low_price, g.high_price,
         GREATEST(
           similarity(lower(g.ingredient_key), (SELECT needle FROM q)),
           similarity(lower(g.display_name),   (SELECT needle FROM q))
         ) AS similarity
  FROM public.grocery_price_reference g, q
  WHERE lower(g.ingredient_key) = q.needle
     OR lower(g.display_name)   = q.needle
     OR lower(g.ingredient_key) % q.needle
     OR lower(g.display_name)   % q.needle
     OR lower(g.ingredient_key) LIKE '%' || q.needle || '%'
     OR q.needle LIKE '%' || lower(g.ingredient_key) || '%'
  ORDER BY similarity DESC
  LIMIT 5;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_ingredient_price(text) TO authenticated, anon, service_role;

-- Upsert helper for the missing-ingredient log
CREATE OR REPLACE FUNCTION public.log_missing_ingredient(
  _name text,
  _store_code text DEFAULT NULL,
  _state_code text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  norm text := lower(trim(_name));
BEGIN
  IF norm IS NULL OR length(norm) = 0 THEN RETURN; END IF;

  INSERT INTO public.missing_ingredient_log
    (ingredient_name, normalized_name, last_store_code, last_state_code, last_user_id)
  VALUES (_name, norm, _store_code, _state_code, auth.uid())
  ON CONFLICT (normalized_name) DO UPDATE
  SET occurrence_count = public.missing_ingredient_log.occurrence_count + 1,
      last_seen_at = now(),
      last_store_code = COALESCE(EXCLUDED.last_store_code, public.missing_ingredient_log.last_store_code),
      last_state_code = COALESCE(EXCLUDED.last_state_code, public.missing_ingredient_log.last_state_code),
      last_user_id    = COALESCE(EXCLUDED.last_user_id, public.missing_ingredient_log.last_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_missing_ingredient(text, text, text) TO authenticated, service_role;

-- updated_at trigger for missing_ingredient_log not needed (no updated_at col)
