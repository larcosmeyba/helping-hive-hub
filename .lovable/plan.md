## Generate This Week's Meal Plan — Full Flow

A guided 4-screen flow that wraps the **existing** `generate-meal-plan` edge function and `MealPlanContext`. Meal-management actions stay where they already live (Meal Plan tab). The approved Instacart flow stays untouched.

### Flow

```
Home → "Generate This Week's Meal Plan"
  → /dashboard/meal-plan/setup        (Step 2: Settings confirmation)
  → /dashboard/meal-plan/generating   (Step 3 loading)
  → /dashboard/meal-plan/why          (Step 4: Why This Plan? + CTAs)
  → /dashboard/meal-plan              (Step 5: existing Meal Plan tab — unchanged)
  → /dashboard/grocery                (Step 6+7: existing grocery list + existing Send to Instacart)
```

### New routes / files

1. `src/pages/dashboard/MealPlanSetupPage.tsx` — Step 2 settings list (Budget, Family Size, Store, Dietary Preferences, Allergies, Pantry Items count, Fridge Items count, Cooking Skill). Each row opens an inline editor or routes to existing Settings field. "Generate Plan" CTA calls `MealPlanContext.generate(...)` with the assembled `meal_plan_context`, then routes to `/meal-plan/generating`.

2. `src/pages/dashboard/MealPlanGeneratingPage.tsx` — Step 3 loading screen ("Building your weekly meal plan…") with the existing 4-stage progress UI. Subscribes to context state; on success routes to `/meal-plan/why`.

3. `src/pages/dashboard/WhyThisPlanPage.tsx` — Step 4. Reads from the just-created plan + profile to render checklist:
   - Stays within $X budget
   - Uses items you already have
   - Reduces food waste
   - Matches dietary preferences / allergies
   - Available at {preferred_store}
   - Portion sizes for {household_size}
   - Matches cooking skill level
   Plus savings sentence ("You'll save ~$X this week"). Primary CTA → `/dashboard/meal-plan`, secondary CTA → `/dashboard/grocery`.

4. Register routes in the dashboard router.

### Home dashboard

Change `DashboardHome` CTA `onClick` from `/dashboard/meal-plan` → `/dashboard/meal-plan/setup`.

### Backend — `meal_plan_context`

Update `supabase/functions/generate-meal-plan/index.ts` to accept (and prefer) a client-supplied `meal_plan_context` object with all spec fields (children buckets, expiring_soon, low_stock, disliked_foods, preferred_meal_count). Falls back to current behavior when omitted, so nothing breaks. Already writes to `meal_plans` + items; we add `estimated_daily_average` and `savings_estimate` to the insert if not already set.

Grocery list auto-generation already runs server-side from meal ingredients (per existing core functionality memory). No change there. The new `grocery_list_items.normalized_item_name` / `checked` / `recipe_id` columns from last migration are honored.

### Not in scope (already done or explicitly out)

- Meal plan management UI (swap, regenerate, save, favorite, mark cooked) — already in `MealPlanPage`.
- Grocery review UI — already in `GroceryListPage` with Send-to-Instacart button.
- Instacart endpoint / payload / button / disclaimer — untouched.
- No new tables. All listed tables already exist.

### Visual

Match the uploaded mockups: white cards on honey-cream background, honey-yellow icon circles, single green primary CTA, no gradients.

Approve and I'll ship the 3 new pages, route registration, the home CTA wire-up, and the optional `meal_plan_context` accept in the edge function.
