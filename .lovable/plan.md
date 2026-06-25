# Weekly Meal Plan Questionnaire

A short questionnaire that runs once every 7 days before generating a meal plan. Answers are saved, surfaced as a reminder card, and passed into the meal generator so meals match what the user actually wants to eat that week.

## 1. Database

New table `weekly_meal_questionnaires`:

- `id uuid pk`
- `user_id uuid` → auth.users
- `week_start date` (Monday of the week, unique per user)
- `breakfast_carbs text[]`, `breakfast_proteins text[]`, `breakfast_fats text[]`, `breakfast_snacks text[]`
- `lunch_carbs text[]`, `lunch_proteins text[]`, `lunch_fats text[]`, `lunch_snacks text[]`
- `dinner_carbs text[]`, `dinner_proteins text[]`, `dinner_fats text[]`, `evening_snacks text[]`
- `vegetables text[]`
- `foods_to_avoid text`
- `allergies text[]`
- `extra_cart_items text`
- `completed_at timestamptz default now()`
- `created_at`, `updated_at`

RLS: user can SELECT/INSERT/UPDATE their own rows. Standard GRANTs to `authenticated` and `service_role`.

Also add `last_weekly_questionnaire_at timestamptz` to `profiles` for fast "is it due?" checks.

## 2. Flow change on Meal Plan Setup

In `MealPlanSetupPage` (and the home action card target), the bottom button is currently `Generate This Week's Meal Plan`. Change it to **`Next`** when no fresh weekly questionnaire exists, and route the user into the new weekly questionnaire. After they submit, continue to the existing generation flow (`/dashboard/meal-plan/generating`).

If a fresh questionnaire already exists for this week, the button stays as `Generate Meal Plan` and goes straight to generation.

## 3. Weekly Questionnaire page

New route: `/dashboard/meal-plan/weekly-questionnaire`

- Title: **Build Your Perfect Meal Plan**
- Subtitle: *Tell us what you enjoy eating this week, and we'll create recipes you'll actually look forward to eating.*
- Multi-step layout reusing `QuestionnaireStep`, `OptionChip`, `MultiChip` patterns.
- Sections in order: Breakfast (carbs/proteins/fats/snacks), Lunch (carbs/proteins/fats/snacks), Dinner (carbs/proteins/fats), Evening snacks, Vegetables, Foods to avoid (textarea), Allergies (multi-select pulling from profile + extras), Extra shopping cart items (textarea).
- Each chip group enforces the per-section cap (3/3/2/2 etc.); selecting an extra chip when at the cap is blocked with a small inline hint.
- Curated chip lists for each macro/meal (about 10–14 options each, kid-friendly + budget-friendly staples). Each section also has an "Add your own" chip for free entry.
- On submit: upsert into `weekly_meal_questionnaires` keyed on `(user_id, week_start)`, update `profiles.last_weekly_questionnaire_at`, then navigate to `/dashboard/meal-plan/generating` and kick off generation.

## 4. Reminder card on Dashboard Home

In `DashboardHome`, above the action cards, render a `WeeklyQuestionnaireReminder` card only when `last_weekly_questionnaire_at` is null or older than 7 days.

- Headline: *It's time to build this week's meal plan.*
- Body: *Choose the foods you want this week and we'll create meals that fit your budget.*
- CTA: **Start This Week's Questionnaire** → `/dashboard/meal-plan/weekly-questionnaire`.

## 5. Edit anytime

On the meal plan screen (`MealPlanPage`), add a small "Update this week's preferences" link that routes back to the weekly questionnaire pre-filled with the latest row for the current week.

## 6. Generator integration

`generate-meal-plan` edge function loads the latest `weekly_meal_questionnaires` row for the user's current week and includes it in the model prompt alongside the existing inputs (weekly budget, family size, Kroger pricing, allergies, dietary restrictions, pantry items, extra cart items). The model treats the chosen foods as strong preferences; Kroger pricing + budget validation stay in the backend exactly as today.

## Technical notes

- Week start = Monday in user's local timezone, stored as `date`.
- Allergies captured here are merged with profile allergies (union) before being passed to the generator — the existing `ALLERGY_EXPANSIONS` nut safety logic still applies.
- Reusing `OptionChip` / `MultiChip` keeps styling consistent with the onboarding questionnaire.
- No new third-party deps.

## Files

New:
- `supabase/migrations/<ts>_weekly_meal_questionnaire.sql`
- `src/pages/dashboard/WeeklyQuestionnairePage.tsx`
- `src/components/dashboard/WeeklyQuestionnaireReminder.tsx`
- `src/lib/weeklyQuestionnaire.ts` (helpers: getCurrentWeekStart, fetch/save, isDue)
- `src/data/weeklyQuestionnaireOptions.ts` (curated chip lists)

Edited:
- `src/App.tsx` (route)
- `src/pages/dashboard/MealPlanSetupPage.tsx` (Next vs Generate)
- `src/pages/dashboard/DashboardHome.tsx` (reminder card)
- `src/pages/dashboard/MealPlanPage.tsx` ("Update this week's preferences")
- `supabase/functions/generate-meal-plan/index.ts` (load + inject weekly answers)
