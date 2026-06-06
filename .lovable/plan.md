# Hybrid Meal Planning Architecture

## Recommendation
Go with the 3-tier hybrid you described. It's the right call: the 325-recipe library gives consistency + popularity + image quality, while OpenAI keeps the flexibility users need for tight budgets, big families, and pantry-first weeks. Instacart is fully out of scope — no checkout code is touched.

## Recipe Cost Audit (current state)
Queried `public.recipes` directly:
- **Total recipes:** 325
- **With `image_url`:** 325 (100%)
- **With `serving_size`:** 325 (100%)
- **With `cost_estimate` > 0:** **69 / 325 (21%)** ← biggest gap
- **Missing cost:** **256 recipes**
- **No `cost_per_serving` column** — can be derived: `cost_estimate / serving_size`
- **No `meal_type` column** — all 325 need backfill
- **No `budget_tier` column**
- **Ingredients** stored as `jsonb` array on `recipes.ingredients` (no normalized `recipe_ingredients` table). Cost can be computed from ingredients only if we map each to a price source — we don't have one today, so first pass = AI-estimated cost + manual admin override.

## Effort Estimate
- **Schema + backfill:** ~1 session (1 migration, 1 backfill edge function for cost + meal_type using gpt-5.4-mini)
- **`generate-meal-plan` rewrite to 3-tier:** ~1 session (selector → AI ranker → AI modifier → AI creator fallback)
- **Variety + usage tracking:** ~0.5 session
- **Pantry-aware grocery list from recipe ingredients:** ~0.5 session
- **Total:** ~3 focused build sessions, shippable incrementally behind the existing `meal_plan_generation_jobs` flow.

## Impact on Existing Data
- **Existing meal plans:** untouched. `meal_plans`, `meal_plan_days`, `meal_plan_meals` keep working. New plans get a nullable `recipe_id` on `meal_plan_meals` linking back to `recipes` when Tier 1/2 was used.
- **Old plans without `recipe_id`:** still render via the meal name + stored ingredients — no breakage.
- **Instacart:** **untouched.** `instacart-create-list`, `SendToInstacartButton`, the selected-for-instacart checkbox flow — none of it changes. Grocery list shape stays the same.

---

## Migration Plan (1 migration, run after approval)

### `recipes` — new columns
- `meal_type text` — one of `breakfast | lunch | dinner | snack` (CHECK)
- `estimated_recipe_cost numeric` — total cost for the full recipe
- `cost_per_serving numeric` — generated/maintained = `estimated_recipe_cost / serving_size`
- `budget_tier text` — `ultra_budget | budget | standard | premium` (CHECK), derived from `cost_per_serving`:
  - ultra_budget ≤ $2, budget ≤ $4, standard ≤ $7, premium > $7
- `source text default 'curated'` — `curated | ai_generated`
- `created_by_user_id uuid` (nullable) — set when Tier 3 saves a new AI recipe
- `times_used int default 0`, `avg_rating numeric` — popularity surface

### New table `recipe_usage`
```
id uuid pk
user_id uuid not null
recipe_id uuid not null references recipes(id)
meal_plan_id uuid
week_start date not null
meal_type text
cooked_at timestamptz
favorited boolean default false
created_at timestamptz default now()
```
Indexes: `(user_id, week_start desc)`, `(recipe_id)`. RLS: users manage their own; admins read all. Grants for `authenticated` + `service_role`.

### Backfill (separate edge function, run once after migration)
- `meal_type`: rule-based pass first (category/tags/title keywords cover ~90%), AI fallback for the rest.
- `estimated_recipe_cost`: keep existing 69; for the other 256 use gpt-5.4-mini in batches of 20 with ingredients + servings as input.
- `cost_per_serving` and `budget_tier`: computed from the above.

---

## Generation Flow (new `generate-meal-plan`)

```text
build context (profile, pantry, fridge, freezer, allergies, budget, household, skill, last 4 weeks of recipe_usage)
        │
        ▼
Tier 1: SQL select candidate recipes
  - filter: dietary, allergies, meal_type per slot, budget_tier ≤ user cap
  - exclude: recipe_ids used in last 4 weeks (unless favorited)
  - boost: recipes whose ingredients overlap pantry/fridge/freezer
  - return ~40 candidates spread across meal_type
        │
        ▼
AI ranker (gpt-5.4-mini, JSON-only)
  input: candidate list + user context + protein-variety rule
  output: 7-day plan referencing recipe_ids, protein rotation enforced
        │
        ▼
Budget check (server-side)
  sum(cost_per_serving × household_size) ≤ weekly_budget?
        │ yes ──────────────► persist
        │ no
        ▼
Tier 2: AI modifier
  ask gpt-5.4-mini to swap expensive ingredients per recipe
  (steak→chicken, fresh→frozen, salmon→tuna),
  keep concept, store as a *recipe_override* on meal_plan_meals
  re-check budget
        │ yes ──────────────► persist
        │ no
        ▼
Tier 3: AI creator
  generate fresh recipes for the failing slots only
  insert into recipes (source='ai_generated', created_by_user_id=user)
  assign Lovable AI image (gemini-2.5-flash-image) — never blank
        │
        ▼
persist meal_plans + meal_plan_days + meal_plan_meals(recipe_id)
write recipe_usage rows for the week
build grocery list (see below)
```

Each stage updates `meal_plan_generation_jobs` exactly like today, so the existing 4-step UI keeps working.

### Variety rules (enforced server-side, not just prompted)
- Block any `recipe_id` present in `recipe_usage` for this user where `week_start >= today - 28 days` AND `favorited = false`.
- Protein diversity: parse primary protein tag from `recipes.tags`; cap any single protein at 2 of 7 dinners unless user opted into repetition.

---

## Grocery List Logic (rewritten)
Source of truth becomes `recipes.ingredients` for Tier 1/2 meals, AI-generated ingredients for Tier 3.

```
needed = union of all meal ingredients (scaled by household_size)
        minus pantry_items (where quantity sufficient AND not low_stock)
        minus fridge_items (same)
        minus freezer_items (same)
        → grocery_list_items
```
- Low-stock or insufficient-quantity items stay on the list.
- Output shape into `grocery_list_items` is unchanged → **Instacart flow untouched**.
- `selected_for_instacart = true` default, same as today.

---

## What OpenAI Does / Doesn't Do
| Does | Doesn't |
|---|---|
| Rank library recipes for the week | Be the recipe database |
| Adjust portions to household | Generate every meal from scratch when library covers it |
| Swap ingredients for budget | Bypass dietary/allergy filters (server pre-filters) |
| Create new recipes only when needed | Touch Instacart payload |
| Write `why_this_plan` rationale | Set prices for library recipes (cached in DB) |

---

## Open Questions Before I Build
1. **Budget tier thresholds** — OK with $2 / $4 / $7 cost-per-serving cutoffs, or set your own?
2. **AI-created recipes** — save as `is_public = false` (private to that user) or `true` (added to the shared library for everyone)?
3. **Backfill cost** — OK to spend ~1 AI call per 20 recipes (≈13 calls total) to estimate the missing 256?

Reply with answers + "approved" and I'll run the migration first, then the backfill, then the generator rewrite.
