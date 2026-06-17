# Phase 1 — Meal Plan Generator Overhaul

Fixes the two critical bugs: plans showing only 2 meals/day, and the $30 vs $118 cost gap. Phase 2 (admin price editor, pantry-staples UI) and Phase 3 (live pricing API) come after this lands.

## What changes

### 1. Always 3 meals/day (server-enforced)
In `supabase/functions/generate-meal-plan/index.ts`:
- After the AI returns, validate every day has `breakfast`, `lunch`, `dinner`. If any slot is missing, the server fills it from the cheapest budget-safe candidate in `cheap_meals` / `budget_staples` filtered by allergies + dietary prefs.
- Add a `MINIMUM_PORTION_MODE` flag the solver flips on when budget is tight: keeps 3 meals at reduced portions instead of dropping a meal.
- Snack only added if the delivered cart is still ≤ 90% of budget after 3 meals × 7 days.

### 2. New whole-package costing model (the real fix for $30 vs $118)
New shared module `supabase/functions/_shared/cartCosting.ts`:
```text
buildConsolidatedCart(meals, householdSize, days, pantryOwned)
  → for each ingredient: total_qty_needed = Σ (per_serving × householdSize × times_used)
  → package = lookupPackage(ingredient, store, zip)
  → packages_to_buy = ceil(total_qty_needed / package.size)
  → line_cost = packages_to_buy × package.price
  → subtract pantry-owned items (skip if user has it)

computeChannelTotals(lines, channel="delivery", store)
  → in_store_subtotal = Σ line_cost
  → item_markup     = in_store_subtotal × 0.18   (delivery only)
  → service_fee     = 5.99
  → delivery_fee    = 3.99
  → bag_fee         = 0.00
  → tip             = (in_store_subtotal + item_markup) × 0.10
  → tax             = in_store_subtotal × state_tax_rate
  → delivered_total = sum of all above
```

All markup/fee constants live in one config object so they're editable in Phase 2.

### 3. Budget solver loop (never exceeds budget)
Replace the single-shot AI call with a loop:
1. AI proposes 3 meals × 7 days from candidate pool.
2. Server runs `buildConsolidatedCart` → `computeChannelTotals` using the **delivered** total.
3. If `delivered_total > weeklyBudget`:
   - Swap most expensive meals for cheaper `cheap_meals` candidates.
   - If still over after 3 swap passes, shift to `MINIMUM_PORTION_MODE` (×0.75 portions, lean on rice/beans/eggs/oats/pasta/PB).
   - Re-cost. Repeat up to 5 iterations.
4. If still infeasible: keep 3 meals at minimum portions, attach `budget_warning` with the cheapest viable upgrade (`"add $X to cover full portions"`). **Never** drop a meal.
5. Final assertion: `assert delivered_total <= weeklyBudget` or attach the warning. Plan is never rendered violating budget without that warning.

### 4. New DB tables (migration)
```text
package_prices
  store, zip_prefix, item_key, brand, package_size, package_unit,
  package_price, servings_per_package, unit_price, category, as_of_date
  → indexed on (store, item_key)

channel_pricing_config
  channel, store, item_markup_pct, service_fee, delivery_fee, bag_fee,
  tip_default_pct, tax_rate
  → seeded for: walmart, aldi, dollar_general, dollar_tree, family_dollar,
    winco, food_4_less, kroger, grocery_outlet, smart_final, instacart

meal_plan_cost_breakdown   (per generated plan)
  meal_plan_id, channel, in_store_subtotal, item_markup, service_fee,
  delivery_fee, bag_fee, tip, tax, delivered_total, budget, remaining,
  budget_exceeded, warning_text
```
All with `GRANT … TO authenticated`, RLS scoped to `auth.uid()` via the parent meal_plan, plus `service_role` for the edge function.

CSV seed: I need the CSV re-uploaded — once it arrives I'll import into `package_prices` with `as_of_date = today`.

### 5. UI changes (`MealPlanPage.tsx`, `GroceryListPage.tsx`)
- Itemized shopping list shows: brand, store, packages × package_price, unit price ($/oz), line total.
- Three totals block: **In-store subtotal · Delivery fees & markup · Delivered total**.
- Budget bar: `Budget $50 · Remaining $4 ✓` (green) or `Over by $12 ⚠` (red, only when warning present).
- Each price line shows `Walmart · ZIP 90011 · as of Jun 17, 2026`.
- Existing `InstacartDisclaimer` component reused under the totals.
- Per-day cards keep showing Breakfast / Lunch / Dinner (+Snack when present) with per-meal cost and macros — already wired; only the cost figures change.

### 6. Defaults
- Channel defaults to **delivered** for everyone (per your answer). No setup UI added for it in Phase 1.
- Pantry-owned uses existing `pantry_items` table — anything with `quantity > 0` is treated as owned and skipped in the consolidated cart.

## Out of scope for Phase 1
- Admin price editor screen (Phase 2).
- Dedicated "Pantry Staples" checklist UI (Phase 2 — using existing pantry_items for now).
- Live grocery pricing API (Phase 3).
- Brand-tier opt-in (Phase 2; defaults to store-brand / lowest unit price now).
- Pickup-vs-delivery toggle (not needed — delivered is the default).

## Acceptance tests Phase 1 covers
1, 2, 3, 5, 6 from your list. Test 4 (pantry-owned lowering total) works via existing `pantry_items`; the dedicated checklist comes in Phase 2.

## What I need from you before I start coding
**Re-upload the CSV** (`item, brand, store, package_est_price, servings_per_package, price_per_serving, category`). I'll start the migration + costing module in parallel, but I can't seed real prices or run acceptance test #2 without it.