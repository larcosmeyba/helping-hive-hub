# Phase A — Extend algo_v2 Meal Plan Engine

Scope is large, additive, and gated by the existing PostHog flag `new-meal-plan-algorithm`. hybrid_v1 remains the default and the fallback. Response contract, job lifecycle, and rate limits are not touched.

## Order of execution

1. **DB migration (Part A)** — additive only. After approval, regenerate types, then code can rely on the new columns.
2. **Shared helpers** — extend `mealPlanOptimizer.ts` and `krogerPricing.ts`.
3. **Generator** — extend `generate-meal-plan/index.ts` (algo_v2 branch + shared steps).
4. **Grocery list edge function** — align 3-bucket grouping.
5. **Client analytics** — add/rename PostHog events with `algorithm_version`.
6. **Tests** — extend `src/test/mealPlanOptimizer.test.ts`.

## Part A — Migration (additive, inherits RLS)

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS disliked_foods text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS kid_friendly boolean,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sodium_mg numeric;

-- Backfill kid_friendly from the existing keyword/tag heuristic
UPDATE public.recipes
SET kid_friendly = (
  (tags && ARRAY['kid-friendly','family-friendly','kids'])
  OR lower(coalesce(name,'')) ~ '(mac.?cheese|chicken nugget|spaghetti|pancake|quesadilla|grilled cheese|pizza)'
)
WHERE kid_friendly IS NULL;

ALTER TABLE public.meal_plan_meals
  ADD COLUMN IF NOT EXISTS carbs_estimate numeric,
  ADD COLUMN IF NOT EXISTS fats_estimate numeric,
  ADD COLUMN IF NOT EXISTS fiber_estimate numeric,
  ADD COLUMN IF NOT EXISTS sodium_estimate numeric;
```

Freezer handled in code via the existing `pantry_items.storage_location` field; no new column unless that field is missing.

## Part B — User context

- Split pantry into pantry / fridge / freezer / expiring (extend `index.ts` ~422). Freezer items treated as $0 owned, passed to optimizer.
- `disliked_foods` now real — confirm wire into `dislikedTerms`.
- Favorite recipe IDs passed as `favoriteRecipeIds` to optimizer for new `FAVORITE_BONUS`.

## Part C — Budget engine (server-side, before selection)

```
TARGET_BUDGET_RATIO = 0.95
MEAL_SPLIT = { breakfast: 0.25, lunch: 0.30, dinner: 0.35, snacks: 0.10 }
targetWeeklySpend = weeklyBudget * 0.95
dailyBudget = targetWeeklySpend / daysCount
snackBudget allocated only if B+L+D leaves headroom; else 0
```
Used as soft scoring targets + running monitor. Hard gate stays at `<= weeklyBudget`.

## Part D — Candidate pools

- Per-meal-type pool: 12 → 30 (top-by-score slice after `.limit(120)` fetch).
- Add `snack` to `fetchCandidates`; pool size 15.

## Part E — Hard filters (fetch + `isFeasible`)

- `recipes.is_active = true` at fetch.
- Skill-too-hard: derive difficulty from prep+cook time + ingredient count; exclude above user `cooking_confidence`. Add to `isFeasible`.
- Toddler-unsafe: when `hasToddler`, filter `TODDLER_CHOKING_HAZARDS` in `isFeasible` (not just the backfill resolver).

## Part F — Pantry matching

- Scale recipe ingredient qty by household servings when building grocery list.
- Compute `pantry_utilization_pct = distinct owned items used / distinct ingredients needed`; include in `plan_data` + job metadata.

## Part G — `krogerPricing.ts`

- Prefer store/Kroger brand when multiple matches (rank by brand-match, then price).
- Capture `availability` (stockLevel), `promo_price` separate from `regular_price`, size-normalized `unit_price`, computed `match_confidence` (name/size/unit similarity, not hardcoded 0.8).
- Accept and use real recipe `quantity` (drop hardcoded 1 at call sites).
- Pantry items still excluded ($0).

## Part H — Scoring (additive constants)

Keep existing weights. Add:
- `KID_FRIENDLY_BONUS` (uses new column).
- `SKILL_FIT_BONUS` (closer to user skill = higher).
- Balanced-nutrition score across calories/protein/carbs/fat/fiber/sodium vs household targets (replaces protein-only).
- `KROGER_CONFIDENCE_BONUS` (only when Kroger connected).
- `FAVORITE_BONUS` for favorited recipe ids.
- Deterministic; stable id tie-breaks.

## Part I — Snacks E2E

Optimizer adds snack slots only when `snackBudget > 0`, picks deterministically from top-15 snack pool under snack budget. OpenAI never selects snacks. Snacks optional.

## Part J — Running budget monitor

Keep existing repair. Emit `meal_plan_over_budget_corrected` event data (swaps count, dollars saved) for client.

## Part K — Validation gates (all → `structuredError` + 200 + `failJob`)

Keep: `budget_unfit`, `kid_friendly_unfit`, per-swap allergy re-check. Add:
- Make `budget_unfit` fire on the estimated-pricing path too (today only warns).
- Serving-size validation (every meal scaled to household).
- Grocery-list validation (non-empty, every Need-To-Buy has price or `estimated` flag).
- Kroger-confidence warning (do not hard-fail).
Emit `meal_plan_validation_passed` / `meal_plan_validation_failed` (client).

## Part L — Grocery list 3-bucket grouping

Buckets: `use_first` (expiring used), `already_have` ($0 owned), `need_to_buy` (rest, deduped/summed, pantry-subtracted). Persist `bucket` field per `grocery_list_items` and in `plan_data`. Same logic mirrored in `generate-grocery-list-from-meal-plan/index.ts`.

## Part M — Nutrition storage

Persist calories/protein/carbs/fat/fiber/sodium to `meal_plan_meals`. No UI change.

## Part N — Analytics events (client, via `trackEvent`)

Add `algorithm_version` to every success/fail event. New/renamed:
- `recipe_candidates_filtered`
- `kroger_price_match_completed`
- `meal_plan_validation_passed`
- `meal_plan_validation_failed`
- `meal_plan_generated_successfully` (alias of existing)
- `meal_plan_over_budget_corrected`
- `grocery_list_generated`
- `shop_with_kroger_clicked` (alias added alongside `shop_at_kroger_clicked`)
- `generation_error` (alias of `meal_plan_generation_failed`)

Server returns the data each event needs in the response (filtered counts, kroger match stats, swap stats) so the client can emit.

## Part O — Sentry (`captureEdgeError` with `{ fn }` tag)

Add targeted captures around: Kroger pricing block, OpenAI gap-fill call, pricing/validation steps. Do NOT capture `budget_unfit` / `kid_friendly_unfit` (expected outcomes — already aligned with HTH-6).

## Files

- `supabase/migrations/<new>.sql` — new
- `supabase/functions/_shared/mealPlanOptimizer.ts`
- `supabase/functions/_shared/krogerPricing.ts`
- `supabase/functions/generate-meal-plan/index.ts`
- `supabase/functions/generate-grocery-list-from-meal-plan/index.ts`
- `src/contexts/MealPlanContext.tsx`
- `src/test/mealPlanOptimizer.test.ts`

## Rollback

- Turn `new-meal-plan-algorithm` OFF → all traffic on hybrid_v1 (unchanged).
- Migrations additive; reverting code leaves new columns harmlessly unused.

## Out of scope

Prompt 2 (Shop Groceries / Budget Fix Engine) and Prompt 3 (Cook What I Have tiers) — not touched here. hybrid_v1 path, response contract, job lifecycle, and rate-limit numbers unchanged.

## First step on approval

Submit the additive migration (Part A) for review. After it runs and types regenerate, proceed with optimizer/generator/pricing/grocery/client/test edits in parallel batches.
