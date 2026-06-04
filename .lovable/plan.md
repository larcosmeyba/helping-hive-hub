## Grocery List Backend — Multi-Source Collection

Build a unified internal grocery list that collects items from multiple sources and feeds them into the **existing approved Instacart flow** (no changes to endpoint, button, CTA, disclaimer, linkback, or handoff).

### What stays untouched
- `SendToInstacartButton` component
- `instacart-create-list` edge function
- `InstacartCTAButton` styling and CTA copy
- `InstacartDisclaimer` component
- `openInstacartExternal` + partner linkback URL

### 1. Migration — extend `grocery_list_items`
Add columns (all nullable / safe defaults so nothing existing breaks):
- `source_type TEXT NOT NULL DEFAULT 'manual'` — values: `meal_plan | fridge_chef | food_waste | pantry_low_stock | manual | bulk_buying`
- `selected_for_instacart BOOLEAN NOT NULL DEFAULT true`
- `source_ref_id UUID` — optional pointer to source recipe/pantry item
- Index `(user_id, source_type)`

Existing `is_checked`, `already_have`, `instacart_search_term`, etc. all stay.

### 2. Edge function: `grocery-list-add-items`
New POST endpoint other features call. Body:
```
{ source_type, items: [{ item_name, quantity, unit, category, estimated_price, instacart_search_term, source_ref_id? }] }
```
Logic:
- Auth user from JWT
- Find or create the user's active `grocery_lists` row (one active list per user)
- Skip items already in `pantry_items` unless `is_low_stock = true`
- Merge duplicates by `lower(item_name)` (sum quantity when possible)
- Insert with `selected_for_instacart = true`
- Return the updated list

### 3. Wire existing features into the new endpoint
- **Meal plan generation** (`generate-meal-plan`): already writes to `grocery_list_items`; just tag `source_type = 'meal_plan'` and run through the same pantry-skip + de-dupe helper (extract shared util).
- **Fridge Chef** "Add missing ingredients" button → call new endpoint with `source_type = 'fridge_chef'`
- **Food Waste recipes** "Add to grocery list" → `source_type = 'food_waste'`
- **Bulk Buying Guide** "Add to list" → `source_type = 'bulk_buying'`
- **Pantry low-stock** "Add to grocery list" → `source_type = 'pantry_low_stock'`
- **Manual add** from grocery page → `source_type = 'manual'`

### 4. GroceryListPage — data-layer update only
Keep current visual design, banners, and the existing `SendToInstacartButton` exactly as-is. Change only:
- Read items from `grocery_list_items` directly (so items added by all 6 sources show up), not solely from `MealPlanContext`
- Checkbox now toggles `selected_for_instacart` (persisted)
- Quantity edit, "already have" toggle, remove, manual add
- When user taps the existing Send to Instacart button: pass only `selected_for_instacart = true` items into the **same existing** `SendToInstacartButton` (no change to its props shape beyond the line-items array it already accepts)

### Out of scope
- AI optimization (future hook, no UI now)
- Multi-list per user
- Any Instacart-side change

Approve and I'll ship it.
