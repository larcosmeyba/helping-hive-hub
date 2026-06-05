-- ============================================================
-- Cleanup migration: verification + SNAP tracking + legacy pricing
-- Protected (NOT touched): Instacart, canonical_products,
-- canonical_product_aliases, meal_plan_meals, pantry_items, grocery,
-- hive_ai_*, family assistance, plaid, profiles (except verification cols).
-- ============================================================

-- 1) Verification system removal
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS verification_status,
  DROP COLUMN IF EXISTS verification_badge,
  DROP COLUMN IF EXISTS verification_verified_at;

DROP TABLE IF EXISTS public.verification_documents CASCADE;

-- 2) SNAP tracking removal (resources/education remain — separate tables)
DROP FUNCTION IF EXISTS public.deduct_snap_balance(uuid, numeric);
DROP TABLE IF EXISTS public.snap_purchase_log CASCADE;
DROP TABLE IF EXISTS public.snap_benefit_tracking CASCADE;

-- 3) Legacy pricing / cross-retailer tables (NOT canonical_products)
DROP TABLE IF EXISTS public.product_price_history CASCADE;
DROP TABLE IF EXISTS public.store_product_prices CASCADE;
DROP TABLE IF EXISTS public.national_food_prices CASCADE;
DROP TABLE IF EXISTS public.regional_food_prices CASCADE;
DROP TABLE IF EXISTS public.bls_regional_cpi_cache CASCADE;
DROP TABLE IF EXISTS public.ingredient_product_mapping CASCADE;
DROP TABLE IF EXISTS public.serpapi_usage CASCADE;
DROP TABLE IF EXISTS public.retailer_products CASCADE;
DROP TABLE IF EXISTS public.store_locations CASCADE;
DROP TABLE IF EXISTS public.state_tax_rules CASCADE;
DROP TABLE IF EXISTS public.provider_sync_logs CASCADE;
DROP TABLE IF EXISTS public.retailers CASCADE;

-- 4) Mark user_outcomes deprecated (kept one cycle)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='user_outcomes') THEN
    EXECUTE 'COMMENT ON TABLE public.user_outcomes IS ''DEPRECATED — slated for removal. No active code references as of cleanup pass.''';
  END IF;
END $$;
