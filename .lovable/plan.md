# Hive AI + Hive Family Assistance — Backend Build Plan

Two separate systems. Mock AI now, OpenAI-ready later. **Existing Instacart integration untouched.**

---

## PART 1 — HIVE AI

### Database migrations
Reuse existing `pantry_items`, `generated_recipes`, `generated_recipe_ingredients` (already present). Add what's missing:

- **Extend `pantry_items`**: ensure `freshness_status` accepts (`good`, `use_soon`, `expiring_today`, `expired`, `low_stock`, `manually_added`, `photo_detected`, `checked_off`) — text field already exists, no schema change needed beyond doc.
- **New `inventory_photos`**: `id, user_id, image_url, scan_type (pantry|fridge|freezer|receipt), ai_processed bool, detected_items_json jsonb, created_at`. RLS: user owns. GRANTs to authenticated + service_role.
- **New `food_waste_alerts`**: `id, user_id, pantry_item_id, alert_type (expiring_today|expiring_soon|low_stock|expired), days_until_expiration int, estimated_value numeric, message text, resolved bool default false, created_at`. RLS: user owns.

### Edge functions (Supabase)
- `create-food-waste-alerts` — scans user's `pantry_items`, computes days-to-expiration, upserts alerts.
- `scan-inventory-photo` — accepts `{ image_base64, scan_type }`, uploads to `inventory-photos` storage bucket (new, private), returns mock detected items array. OpenAI Vision hook stubbed with TODO.
- `generate-recipes-from-inventory` — already exists as `cook-from-what-i-have`. Add thin alias OR keep existing; wire client to it. Confirm it prioritizes `use_soon`/`expiring_today` items.
- `add-missing-items-to-grocery-list` — already exists as `grocery-list-add-items`. Reuse.
- `mark-recipe-cooked` — already exists. Extend to resolve related `food_waste_alerts` for consumed pantry items.

### Storage
- Create private bucket `inventory-photos` for user scans.

### Context object
- New file `src/lib/hiveAiContext.ts` + `supabase/functions/_shared/hiveAiContext.ts`: builds `hive_ai_context` from profile + pantry + alerts + grocery list. Passed into mock AI calls now; OpenAI later.

### UI wiring (minimal — most screens already exist)
- Bottom nav: rename "Hive AI" tab — currently points to `/dashboard/fridge-chef`. Keep route but ensure landing dashboard surfaces: Add Items, Scan Photo, AI Detected Review, Inventory, Food Waste Alerts, Meals From What You Have. Most exist (PantryPage, CookInventoryPage, CookRecipesPage, CookRecipeDetailPage, CookAddedToGroceryPage).
- Add lightweight `ScanInventoryPage` (camera/upload → calls `scan-inventory-photo` → review screen to confirm detected items → bulk insert into `pantry_items`).
- Add `FoodWasteAlertsPage` listing alerts from `food_waste_alerts` with "Use These Items First" CTA → routes to `/dashboard/cook`.
- Wire "Use These Items First" button on `DashboardHome` Hive Assistant card to first call `create-food-waste-alerts` then route to `/dashboard/cook`.

---

## PART 2 — HIVE FAMILY ASSISTANCE

### Database migrations
- **New `family_assistance_profiles`**: `id, user_id (unique), zip_code, household_size, children_under_5, children_5_to_12, teenagers, seniors_65_plus, employment_status, lost_job_recently bool, reduced_hours_recently bool, monthly_income_range text, currently_receiving_snap bool, currently_receiving_wic bool, currently_receiving_medicaid bool, created_at, updated_at`. RLS user-owned.
- **New `assistance_needs`**: `id, user_id (unique), needs_food_assistance bool, needs_snap bool, needs_wic bool, needs_diapers_formula bool, needs_housing bool, needs_utilities bool, needs_healthcare bool, needs_transportation bool, needs_childcare bool, needs_employment bool, created_at, updated_at`. RLS user-owned.
- **New `local_resources`**: `id, resource_name, category (enum text), description, address, city, state, zip_code, phone, website_url, application_url, hours, eligibility_notes, documents_needed text[], verified bool, created_at, updated_at`. Public SELECT (anon + authenticated); admin manage.
- **New `saved_resources`**: `id, user_id, resource_id → local_resources, status (saved|applied|contacted|completed), notes, created_at, updated_at`. RLS user-owned.

All four with GRANTs (authenticated + service_role; anon SELECT only on `local_resources`).

### Edge functions
- `submit-family-assistance-questionnaire` — upsert into both `family_assistance_profiles` and `assistance_needs`.
- `match-family-resources` — query `local_resources` by zip prefix + needed categories; mock-AI ranks/explains (TODO OpenAI). Returns array with "may qualify" hedged language.
- `get-resource-details` — single resource by id (anon-readable, but called via function to keep room for AI enrichment).
- `save-resource` — insert into `saved_resources`.
- `update-resource-status` — update `saved_resources.status` and `notes`.

### Context object
- `family_assistance_context` builder in `supabase/functions/_shared/familyAssistanceContext.ts` consumed by `match-family-resources`.

### UI
- Home Page card (already present) — keep route to `/dashboard/resources`.
- `ResourceHubHome` already exists. Add short questionnaire flow at `/dashboard/resources/intake` (new page) that posts to `submit-family-assistance-questionnaire` then routes to results.
- Results page: `/dashboard/resources/matches` — calls `match-family-resources`, renders resource cards with hedged copy ("You may qualify for…").
- Detail page (already exists `ResourceDetailPage`): add Save / Apply / Call / Website actions wired to `save-resource` and `update-resource-status`.

### AI safety language
Edge functions and UI must use "may qualify"/"may be helpful"/"please confirm eligibility directly". Never "you qualify" / "approved".

---

## What stays untouched
- Instacart endpoint, CTA, disclaimer, payload, handoff, partner linkback.
- Existing meal plan, grocery list, cook flow pages already shipped.

---

## Build order
1. Migration 1 — Hive AI tables (`inventory_photos`, `food_waste_alerts`) + storage bucket.
2. Migration 2 — Family Assistance tables (4 new).
3. Edge functions (Hive AI: 2 new + 1 extend; Family: 5 new).
4. Shared context builders.
5. UI: ScanInventoryPage, FoodWasteAlertsPage, FamilyAssistance intake + matches pages; wire CTAs.
6. Seed a handful of `local_resources` for demo.

Skipping: changes to Instacart code, changes to existing meal-plan/grocery/cook pages beyond minor wiring.

Total: ~2 migrations, 7 edge functions, ~5 new pages, ~2 shared libs.
