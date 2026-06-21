-- Truncate the 24h Kroger product-match cache so the new relevance-gated,
-- cheapest-first matcher applies immediately. Cache is rebuilt on demand
-- by the next match request; no user data is lost.
DELETE FROM public.kroger_product_matches;