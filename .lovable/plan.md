# Phase B — Shop Groceries (Kroger-only, additive, flag-gated)

Gated by existing PostHog flag `new-meal-plan-algorithm`. Old grocery pages remain as fallback. Reuses what's already in the codebase (3-bucket `store_section`, `kroger-match-grocery-list`, `KrogerBudgetCard`, `useKrogerConnection`, `ShopGroceriesButton`).

## Execution order

1. **Pure helper + tests** — `supabase/functions/_shared/budgetFix.ts` + `src/test/budgetFix.test.ts`. No DB. Deterministic ranked swap engine for the 6 strategies in Part 5.
2. **New edge fn** `grocery-list-item-update` — RLS-scoped mutate of `grocery_list_items` (remove / mark already_have / change qty / substitute). `captureEdgeError`. JWT-validated in code.
3. **New edge fn** `pantry-bulk-add` — bulk insert bought Need-To-Buy items into `pantry_items` with estimated expirations + storage_location (mirrors `confirm-scanned-items` insert pattern). `captureEdgeError`.
4. **`update-grocery-status`** — add `captureEdgeError`; accept `shopped` as alias for `purchased` if not already; set `grocery_purchase_date`. No contract change.
5. **`ShopGroceriesPage.tsx`** (NEW) — Parts 1–9 wired through the above. Uses `KrogerBudgetCard` for price+audit, `useKrogerConnection` for fallback, `ShopGroceriesButton` for Kroger CTA, `trackEvent` for all PostHog events.
6. **`App.tsx`** — add `/dashboard/grocery/shop` route, gated by `useFeatureFlag('new-meal-plan-algorithm')`. When off → redirect to existing `GrocerySummaryPage`.
7. **Entry CTAs** — add "Shop Groceries" CTA on the meal-plan + grocery-summary pages (only when flag on), pointing at the new route. Existing CTAs untouched when flag off.

## Page architecture (`ShopGroceriesPage.tsx`)

```text
load: meal_plans (active) → grocery_lists (by meal_plan_id) → grocery_list_items
parse store_section "<bucket>:<category>" → bucket + category
section render:
  ├─ Use First       (bucket = use_first)
  ├─ Already Have    (bucket = already_have, $0, excluded from total)
  └─ Need To Buy     (bucket = need_to_buy, grouped by category)
on mount:
  - emit shop_groceries_opened, pantry_items_removed_from_total
  - if kroger.ready && location_id → invoke kroger-match-grocery-list
      emit kroger_product_match_started / _completed
  - else → estimated prices + Connect CTA
budget audit:
  weeklyBudget = profiles.weekly_budget
  target = weeklyBudget * 0.95
  total = Σ(need_to_buy item.unit_price × qty)
  if total ≤ weeklyBudget → grocery_budget_audit_passed
  else                   → grocery_budget_audit_failed + show Fix My Budget panel
fix panel: lists ranked swaps from budgetFix.ts; "Fix My Budget" applies best combo via grocery-list-item-update → re-prices → emit budget_fix_applied
manual edits: Remove / Substitute / Already Have / Qty → grocery-list-item-update → re-price
checkout: final skipCache:true match → flag unavailable, suggest replacements (reuse budgetFix) → ShopGroceriesButton → emit shop_with_kroger_clicked
post-shop: prompt "Add to pantry?" → update-grocery-status('purchased') + pantry-bulk-add → emit pantry_update_after_shop_clicked
```

## Budget Fix strategies (`budgetFix.ts`, pure)

Input: items[], pantry[], grocery_price_reference rows, weeklyBudget, current total.
Output: ranked `Suggestion[] { item_id, type, fromName, toName, dollarsSaved, newQty?, newAlready_have? }` + `bestCombo` that brings total ≤ budget.

Strategies (deterministic, stable sort by $ saved desc, then item_id):
1. `store_brand_swap` — match name → grocery_price_reference store-brand variant.
2. `cheaper_protein` — table of canonical substitutions (breast→thighs, beef→turkey, salmon→tilapia…).
3. `frozen_or_canned` — fresh produce → frozen; fresh tomato → canned.
4. `drop_optional` — items flagged optional or in snack category when over budget.
5. `use_more_pantry` — items whose name matches a pantry entry (fuzzy) → flip to already_have.
6. `cheaper_recipe` — highest-cost meal in plan → suggest swap-meal (UI emits, server handled by existing swap-meal fn).

## Files

| File | Status |
|---|---|
| `supabase/functions/_shared/budgetFix.ts` | NEW |
| `src/test/budgetFix.test.ts` | NEW |
| `supabase/functions/grocery-list-item-update/index.ts` | NEW |
| `supabase/functions/pantry-bulk-add/index.ts` | NEW |
| `supabase/functions/update-grocery-status/index.ts` | EDIT (Sentry) |
| `src/pages/dashboard/ShopGroceriesPage.tsx` | NEW |
| `src/App.tsx` | EDIT (route + flag) |
| `src/pages/dashboard/MealPlanPage.tsx` + `GrocerySummaryPage.tsx` | EDIT (entry CTA when flag on) |

## Contracts preserved

- `generate-meal-plan`, response contract, job lifecycle, rate limits, old grocery pages → unchanged.
- `kroger-match-grocery-list` input/output unchanged.
- All `grocery_list_items` mutations RLS-scoped to owner.
- Kroger failure → estimated pricing, never a hard error.

## Rollback

- Flag OFF → new page unreachable, existing pages serve.
- Pantry-bulk-add lives in its own commit so post-shop write can be reverted independently.

## Out of scope

Prompt 3 (Cook What I Have tiers), Kroger cart API (TODO comment in checkout), changes to meal-plan generation or existing grocery review pages.

## First step on approval

Write `budgetFix.ts` + its unit tests, then the two new edge functions in parallel, then the page + route + entry CTAs.
