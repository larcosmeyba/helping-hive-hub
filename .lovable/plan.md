## Help The Hive — Kroger-First Meal Planning, Questionnaire & Pantry Overhaul

This is a large, multi-system change. I'll break it into phases so we can ship and verify incrementally. Each phase ends with something testable.

---

### Phase 1 — Questionnaire restructure (frontend only)

**File:** `src/pages/Questionnaire.tsx` (+ small additions to profile schema if needed)

New step order (12 steps):
1. Household — adults count
2. Children — count + ages (dynamic age inputs for 5–12 logic)
3. Babies/Toddlers — count
4. Weekly grocery budget
5. Dietary preferences / allergies
6. Cooking skill level (Beginner / Intermediate / Advanced) — **new explicit step**
7. Pantry staples on hand (already exists)
8. Disliked foods
9. Food waste habits
10. **Family Assistance needs** (SNAP, food, transport, housing, childcare, utilities, financial) — multi-select; drives prompt in Phase 6
11. **Connect Kroger** — "Connect Kroger" + "Continue Without Kroger" buttons; uses existing `useKrogerConnection.connect()`
12. Summary + "Finish & See My Plan"

Profile columns needed (migration):
- `adults_count int`, `children_count int`, `children_ages int[]`, `babies_count int`
- `assistance_needs text[]` (already-ish via `assistance_needs` table, but we store the questionnaire snapshot on profile for fast read)

Pantry sync fix: on submit, write each pantry staple into `public.pantry_items` (insert rows with `user_id`, `item_name`, `location='pantry'`) in addition to updating `profiles.pantry_items`. Currently questionnaire only stores them on the profile JSON — that's the bug in item 7.

---

### Phase 2 — Kroger gating in meal plan generation (frontend)

**Files:** `src/pages/dashboard/MealPlanSetupPage.tsx`, `src/pages/dashboard/MealPlanPage.tsx`, new `src/components/kroger/KrogerRequiredBanner.tsx`

- Before "Generate Plan" runs, check `useKrogerConnection().ready`.
- If not ready: show modal — "Connect Kroger for live pricing accuracy" with **Connect Kroger** / **Continue Without Kroger** buttons.
- If user continues without: pass `pricing_mode: "estimated"` to the edge function and show a yellow "Pricing accuracy reduced" banner on the resulting plan.

---

### Phase 3 — Edge function: Kroger-priced budget enforcement loop

**File:** `supabase/functions/generate-meal-plan/index.ts` + `supabase/functions/_shared/mealPlanContext.ts` + new `supabase/functions/_shared/krogerPricing.ts`

New flow when Kroger is connected:
1. Generate plan with Gemini (existing).
2. Build grocery list from meal ingredients (existing helper).
3. For each grocery item, look up Kroger price via existing `kroger_product_matches` / `kroger_pricing_cache` (call Kroger Products API for misses, cache result).
4. Sum priced subtotal.
5. If `subtotal > weekly_budget`: re-prompt Gemini with `{over_budget_by, expensive_items}` and ask it to swap the N most expensive meals for cheaper equivalents. Loop up to 3 attempts.
6. Persist final priced breakdown to `meal_plan_cost_breakdown`.
7. If still over after 3 attempts, attach `budget_warning` and surface to UI (do not block — still ship the plan with warning).

When Kroger not connected: skip pricing loop, mark plan `pricing_mode='estimated'`, no Kroger calls.

---

### Phase 4 — Meal generation prompt: family size, kid-friendly, skill level, full instructions

**File:** `supabase/functions/generate-meal-plan/index.ts` (prompt + schema)

Prompt additions:
- Inject `adults_count`, `children_count`, `children_ages`, `babies_count`, `cooking_confidence`.
- Rule: if any child age is 5–12, ≥3 meals/week must be kid-friendly (tacos / pasta / breakfast burritos / rice bowls / sheet pan).
- Rule: if `babies_count > 0`, grocery list must include milk + yogurt + soft fruit quantities scaled by `babies_count`.
- Rule: recipe complexity matches `cooking_confidence` (beginner = ≤8 ingredients, ≤30 min, ≤6 steps; advanced = unrestricted).
- Servings sized for `adults_count + children_count` (toddlers excluded — handled via grocery extras).

Schema additions per meal (already partially present, enforce):
- `ingredients: [{name, quantity, unit}]`
- `instructions: string[]` — non-empty, numbered steps. Reject and regenerate if any meal has empty instructions.

---

### Phase 5 — Plan validation gate (frontend)

**File:** new `src/lib/validateMealPlan.ts`, used by `MealPlanPage.tsx`

Before rendering, validate:
- Plan has 7 days × 3 meals
- Every meal has ingredients + instructions (non-empty)
- Family size matches profile
- Kroger pricing present if `pricing_mode='kroger'`
- Subtotal ≤ budget OR `budget_warning` set

If any required check fails: show error card + "Regenerate" button instead of partial plan.

---

### Phase 6 — Family Assistance prompt

**Files:** `src/pages/dashboard/DashboardHome.tsx` (or first post-questionnaire screen), new `src/components/dashboard/FamilyAssistancePrompt.tsx`

After questionnaire, if `assistance_needs.length > 0`, show dismissible banner:
> "We found resources that may help your family."
> **[Open Hive Family Assistance →]** → routes to `/dashboard/family-assistance` with the selected need types pre-filtered by ZIP.

---

### Phase 7 — Pantry sync verification

Covered by Phase 1 write into `pantry_items`. Add Playwright smoke test: complete questionnaire with 3 pantry staples → navigate to `/dashboard/pantry` → assert all 3 visible.

---

### Technical notes

- **Migration** (Phase 1): add family-size columns + `pricing_mode` to `meal_plans` and `meal_plan_generation_jobs`.
- **Kroger pricing cache**: reuse `kroger_pricing_cache` table; TTL 24h.
- **Cost loop**: hard cap 3 Gemini re-prompts to control credits/latency. Each iteration logs to `meal_plan_generation_jobs.status_message` so the progress UI shows "Adjusting plan to fit budget…".
- **Backward compat**: existing plans without `pricing_mode` default to `estimated` on read.
- **No Instacart code touched.**

---

### Suggested ship order

I recommend shipping in this order, verifying each before the next:
1. Phase 1 + Phase 7 (questionnaire + pantry fix — visible immediately)
2. Phase 6 (family assistance prompt)
3. Phase 2 (Kroger gating UI)
4. Phase 3 + Phase 4 (backend pricing loop + prompt rules)
5. Phase 5 (validation gate)

**Want me to start with Phase 1 + 7, or ship all phases in one pass?**
