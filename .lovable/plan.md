## Grocery List + Cook From What I Have — Backend

Two coordinated backends. The existing approved Instacart flow is **not touched** (button, endpoint, CTA, payload, disclaimer, linkback all stay).

---

### PART 1 — Grocery List (extends what we already shipped)

**Migration:** add missing columns to `grocery_list_items`:
- `recipe_id UUID` (link to generated_recipes)
- `normalized_item_name TEXT` (lower-trim of item_name)
- `checked BOOLEAN DEFAULT false` (already_have is separate)

(`source_type`, `selected_for_instacart`, `source_ref_id` already added in last migration.)

**Edge function `grocery-list-add-items`** (already shipped): accepts all source types — `meal_plan | cook_from_what_i_have | food_waste | pantry_low_stock | manual | bulk_buying`. Add `cook_from_what_i_have` to its allowed-sources list (currently `fridge_chef`; rename).

**Helper `src/lib/groceryList.ts`** (already shipped): expose `addItemsToGroceryList(source_type, items[])`. Update the type union to use `cook_from_what_i_have`.

**Out of scope this pass:** rewriting `GroceryListPage` UI. The page already supports category grouping, check/uncheck, manual add, Send to Instacart via existing button. We just point its data source at `grocery_list_items` so multi-source items appear — separate UI pass if you want.

---

### PART 2 — Cook From What I Have

**Migrations**

1. Extend `pantry_items`:
   - `normalized_item_name TEXT`
   - `freshness_status` already exists; extend allowed values via app code (no DB enum) to include `manually_added`, `photo_detected`, `checked_off`

2. New `generated_recipes` table:
   - `user_id`, `source_type` (`cook_from_what_i_have | food_waste | meal_plan`), `recipe_name`, `description`, `servings`, `prep_time_minutes`, `cook_time_minutes`, `difficulty`, `estimated_cost_of_missing_items`, `savings_estimate`, `food_waste_reason`, `instructions JSONB`, `status` (`suggested | saved | cooked`), `cooked_at`, timestamps
   - RLS: user owns rows
   - GRANTs to authenticated + service_role

3. New `generated_recipe_ingredients` table:
   - `recipe_id`, `user_id`, `item_name`, `normalized_item_name`, `quantity`, `unit`, `already_have`, `source_location` (`pantry | fridge | freezer | grocery_needed`), `pantry_item_id`, `estimated_price`, `instacart_search_term`, `created_at`
   - RLS + GRANTs same pattern

**Edge function `cook-from-what-i-have`** (new):
- Auth user from JWT
- Pull pantry/fridge/freezer items, tag freshness (expiring_today / use_soon / low_stock / good — exclude expired)
- Pull profile (household, dietary, allergies, cooking confidence)
- Call Lovable AI Gateway (`google/gemini-2.5-flash`) with the assembled context and a `return_recipes` tool schema requesting 3 recipes that maximize use of existing items, flagging missing ingredients, food-waste reason, and estimates
- Persist recipes + ingredients
- Return structured recipes

**Edge function `mark-recipe-cooked`** (new):
- Decrement pantry quantities for `already_have` ingredients
- Mark fully-used items `freshness_status = 'checked_off'`
- Update recipe `status = 'cooked'`, `cooked_at = now()`
- Log waste-savings delta

**Food Waste Alert helper**
- Re-use existing pantry freshness function on the client to surface expiring counts + estimated value
- No new table needed for v1 — alerts are derived

---

### PART 3 — Frontend hook-ups (minimal, backend-first)

- `src/lib/cookFromWhatIHave.ts` — thin client wrappers calling the two new edge functions and `addItemsToGroceryList('cook_from_what_i_have', missingIngredients)`
- Rename existing `FridgeChefPage` route content to call the new endpoint; keep page path for backward compat (UI overhaul not in this pass)

---

### What I will NOT change
- `SendToInstacartButton`, `InstacartCTAButton`, `instacart-create-list`, `InstacartDisclaimer`, `openInstacartExternal`, partner linkback URL
- Existing meal plan generator (already writes to `grocery_list_items`; tagging it `meal_plan` source happens in a follow-up if you want)

Approve and I'll ship the migrations + 2 edge functions + client helpers in this turn.
