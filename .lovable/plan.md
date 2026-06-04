## Onboarding Questionnaire Expansion — Plan

Expand the existing 9-step questionnaire into an 11-section questionnaire whose answers are stored as permanent profile attributes, editable from Settings, and exposed to all AI integrations (Hive Assistant, Meal Planning, Pantry, Food Waste, Plaid, Apollo Reborn) via a shared profile-context object.

---

### 1. Database schema changes (single migration)

Add new columns to `public.profiles` (all nullable so existing users aren't broken):

**Household composition**
- `children_under_5` int default 0
- `children_5_to_12` int default 0
- `teenagers` int default 0
- `seniors_65_plus` int default 0

**Store preference**
- `preferred_store_id` text (keeps existing `home_store` text)

**Family assistance needs** (booleans, default false)
- `assistance_food`, `assistance_snap`, `assistance_wic`, `assistance_diapers`, `assistance_housing`, `assistance_utilities`, `assistance_healthcare`, `assistance_employment`, `assistance_transportation`, `assistance_childcare`

**Food waste prefs**
- `food_waste_alerts_enabled` bool default true
- `food_waste_recipe_suggestions_enabled` bool default true

**Budget tracking**
- `plaid_interest` text check in ('yes','later','skip')

**Apollo goals** (booleans, default false)
- `goal_lose_weight`, `goal_build_muscle`, `goal_stay_active`, `goal_improve_mobility`

Reuses existing columns: `household_size`, `weekly_budget`, `zip_code`, `city`, `state`, `home_store`, `dietary_preferences` (array), `cooking_confidence`, `questionnaire_completed`.

No new tables. RLS already covers profiles.

---

### 2. Questionnaire UI (`src/pages/Questionnaire.tsx`)

Restructure to 11 sections matching the spec, in this order:

1. Household Profile — household size + child/teen/senior counts
2. Budget Profile — weekly grocery budget slider
3. Location Profile — ZIP (auto-fills city/state via existing reverse geocode)
4. Grocery Store Preference — store picker (writes `home_store` + `preferred_store_id`)
5. Family Assistance — multi-select chips (10 options)
6. Dietary Profile — multi-select chips (8 options, stored in `dietary_preferences`)
7. Cooking Confidence — beginner / intermediate / advanced
8. Pantry Defaults — seeds `pantry_items` (same as today)
9. Food Waste Preferences — 2 toggles
10. Budget Tracking — Plaid interest (yes / later / skip)
11. Apollo Goals — multi-select goals

Final step writes everything to `profiles` in one update, sets `questionnaire_completed = true`, redirects to `/dashboard`.

Welcome intro screen kept as the first card (does not count toward the 11).

---

### 3. Settings page — make every answer editable

Extend `src/pages/dashboard/SettingsPage.tsx` with grouped sections that mirror the questionnaire so users can update any value later. Reuse the same chip / slider / toggle components.

---

### 4. Shared AI profile-context helper

Add `src/lib/aiProfileContext.ts`:

```ts
export function buildProfileContext(profile): ProfileContext { ... }
```

Returns a normalized object (household, budget, location, store, assistance[], dietary[], cookingConfidence, foodWaste, plaidInterest, apolloGoals[]). Mirrored Deno helper at `supabase/functions/_shared/profileContext.ts` so every edge function (generate-meal-plan, fridge-chef, future Hive Assistant, etc.) injects the same context block into Gemini/OpenAI prompts.

Wire it into `generate-meal-plan` and `fridge-chef` now; other features pick it up as they're built.

---

### Technical notes

- Migration adds columns + a CHECK on `plaid_interest`; no destructive changes.
- `questionnaire_progress` jsonb already exists — used to persist partial progress across sessions.
- Existing onboarding fields keep their column names so no data migration is required.
- All new fields default to safe values so users created before the migration continue to load.

---

### Out of scope (call out, don't build)

- Plaid SDK integration itself (only intent capture now)
- Apollo Reborn recommendation engine (only goal capture now)
- Hive Assistant chat surface (context helper is ready; UI is a separate task)
