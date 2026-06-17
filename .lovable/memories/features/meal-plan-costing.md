---
name: Meal Plan Costing & Budget Enforcement
description: Whole-package + channel-aware delivered total drives the budget cap; never sum per-serving fractions
type: feature
---

The budget that families see must equal what they pay at Instacart checkout.

## Hard rules
- Every generated plan = 7 days × 3 meals (breakfast + lunch + dinner). Snacks only if delivered total ≤ 90% of budget afterwards. NEVER drop a meal — use `buildMinimumPortionStaple` (rice/beans/eggs/oats/pasta/PB) at reduced portions and attach a `budget_warning` instead.
- Channel defaults to **delivery** for every user. The budget is enforced against `channelBreakdown.delivered_total`, not in-store subtotal.
- Delivered total = in-store subtotal × `PACKAGE_WASTE_MULTIPLIER (1.35)` (until `package_prices` is CSV-seeded) + item markup + service fee + delivery fee + bag fee + tip + tax, per `channel_pricing_config` for the user's store.
- Never display a plan where delivered_total > weeklyBudget without `budgetWarningText` set.

## Data tables
- `package_prices` — real whole-package prices per (item_key, store, zip). Seed pending from user-uploaded CSV.
- `channel_pricing_config` — fee model per (store, channel). Seeded for walmart, aldi, dollar_general, dollar_tree, family_dollar, winco, food_4_less, kroger, grocery_outlet, smart_final, instacart, default.
- `meal_plan_cost_breakdown` — one row per meal_plan with full delivered breakdown + budget/remaining/warning.

## Code
- `supabase/functions/_shared/cartCosting.ts` — `loadChannelConfig`, `computeChannelTotals`, `lookupPackagePrice`, `normalizeStoreCode`, `PACKAGE_WASTE_MULTIPLIER`.
- `supabase/functions/generate-meal-plan/index.ts` — runs the budget solver loop against delivered_total, persists cost breakdown.
- `src/types/mealPlan.ts` `GeneratedMealPlan.channelBreakdown` — UI uses this as the authoritative total when present.

## Phase 2 (not yet built)
- Admin price editor screen for `package_prices`.
- Dedicated "Pantry Staples" checklist UI (currently uses `pantry_items` rows).
- Brand-tier opt-in (currently defaults to store-brand / lowest unit price).
- Live grocery pricing API integration (Phase 3).
- Pickup-vs-delivery toggle (delivered is the only default for now).
