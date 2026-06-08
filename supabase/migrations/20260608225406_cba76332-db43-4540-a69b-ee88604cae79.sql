
-- 1) Revoke anon (and PUBLIC) execute on SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.lookup_ingredient_price(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_missing_ingredient(text, text, text) FROM anon, PUBLIC;

-- 2) Drop redundant "Service role manages ..." always-true policies.
-- service_role bypasses RLS, so these policies add no access — they just trip the linter.
DROP POLICY IF EXISTS "Service role manages plaid connections"   ON public.plaid_connections;
DROP POLICY IF EXISTS "Service role manages plaid accounts"      ON public.plaid_accounts;
DROP POLICY IF EXISTS "Service role manages food transactions"   ON public.food_transactions;
DROP POLICY IF EXISTS "Service role manages budget summaries"    ON public.food_budget_summaries;
DROP POLICY IF EXISTS "Service role manages budget insights"     ON public.budget_ai_insights;
DROP POLICY IF EXISTS "Service role manages meal plan insights"  ON public.meal_plan_ai_insights;

-- 3) Remove overly permissive UPDATE on missing_ingredient_log.
-- The log_missing_ingredient() SECURITY DEFINER function performs upserts
-- on behalf of users, so no direct UPDATE policy is needed.
DROP POLICY IF EXISTS "Authenticated can bump occurrence count" ON public.missing_ingredient_log;
DROP POLICY IF EXISTS "Authenticated can log missing ingredients" ON public.missing_ingredient_log;
