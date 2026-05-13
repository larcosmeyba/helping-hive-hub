# Help The Hive — Home + Resource Hub Redesign

This is a large, multi-surface redesign. Before I start writing code, I want to lock scope, confirm the data model for resources, and confirm a few product decisions so I don't ship something you'll have to redo.

## What's in scope

1. **Today / Home page** (`src/pages/dashboard/DashboardHome.tsx`) — full rebuild
   - Greeting, 4 summary cards (ZIP, Budget, Household, Saved)
   - "Your Hub" 6-card grid (Meal Plan, Grocery, Pantry, Fridge Chef, Resource Hub, Bulk Buying)
   - Weekly Progress card (% budget used, spend, left, meals cooked, cost/meal)
   - Remove existing meal/grocery/fridge shortcuts on Today
2. **Resource Hub** — new section under `/dashboard/resources`
   - Hub home: 14 category cards, ZIP-aware
   - Category page: list of nearby resources (distance, open-now, tags)
   - Detail page: photo, hours, address, phone, website, directions, what-to-bring, save
   - "No resources found" fallback with 211 / SNAP office / gov lookup links
3. **Bulk Buying Guide** — new page `/dashboard/resources/bulk-buying`
   - 12 staples with photo, shelf life, family-savings note
   - "Checkout with Instacart" per item using existing `SendToInstacartButton`
4. **Bottom nav** stays exactly: Today, Meal Plan, Pantry, Grocery, Fridge Chef (Resource Hub reached via Your Hub card, not nav)
5. **Recipe photos** — audit meal generator to make sure `imageUrl` is always populated; fall back gracefully (already handled by `MealImage`, but I'll verify the generator pipeline actually emits photos)

## What's NOT in scope (per your instructions)

- Fridge Chef UI/flow — untouched
- Pantry — only restyled to match new tokens, no logic changes
- Meal Plan / Grocery list pages — untouched (only the Today shortcuts to them are removed)

## Technical approach

### Data model for resources
I'll add three tables via migration:
- `resource_categories` — slug, title, description, icon name (seeded with the 14 categories)
- `resources` — name, category_slug, address, lat/lng, zip, phone, website, hours (jsonb), tags (text[]), about, what_to_bring, eligibility, image_url, verified
- `saved_resources` — user_id, resource_id (RLS: own rows only)

Distance + "nearby" computed client-side from user's stored ZIP centroid (we already have ZIP in profile). For v1 I'll seed a small set of national/sample resources keyed by ZIP prefix; admin can add more later. If no rows match the user's ZIP region → "no resources found" fallback.

### Routing
```
/dashboard                          → Today (redesigned)
/dashboard/resources                → Hub home (14 categories)
/dashboard/resources/bulk-buying    → Bulk Buying Guide
/dashboard/resources/:categorySlug  → Category list
/dashboard/resources/detail/:id     → Resource detail
```
Every resource page has a back button (uses `navigate(-1)` with hub home fallback).

### Visual system
Honey cream background (`hsl(43 100% 96%)`), green accent already in tokens, soft shadows, rounded-2xl cards, lucide icons, Framer Motion stagger on grid mounts. Matches your mockups (cream cards, green accents, compact stat chips).

### Files I'll create
- `src/pages/dashboard/ResourceHubHome.tsx`
- `src/pages/dashboard/ResourceCategoryPage.tsx`
- `src/pages/dashboard/ResourceDetailPage.tsx`
- `src/pages/dashboard/BulkBuyingGuide.tsx`
- `src/components/dashboard/home/GreetingHeader.tsx`
- `src/components/dashboard/home/SummaryCards.tsx`
- `src/components/dashboard/home/YourHubGrid.tsx`
- `src/components/dashboard/home/WeeklyProgress.tsx`
- `src/components/dashboard/resources/ResourceCard.tsx`
- `src/components/dashboard/resources/CategoryCard.tsx`
- `src/components/dashboard/resources/ResourceBackButton.tsx`
- `src/data/bulkBuyingItems.ts` (12 staples + Instacart line items)

### Files I'll edit
- `src/pages/dashboard/DashboardHome.tsx` — full rebuild
- `src/App.tsx` — add 4 new routes
- `src/components/dashboard/BottomNavBar.tsx` — verified unchanged (5 tabs)

## Phasing

I'll ship in this order so each phase is reviewable:
1. **DB migration** for resource tables + seed data (asks for your approval first)
2. **New Today page** + Your Hub + Weekly Progress
3. **Resource Hub home** + category + detail pages
4. **Bulk Buying Guide** with Instacart per-item checkout
5. **Recipe photo audit** — confirm meal generator always emits `imageUrl`

## Decisions I need from you

1. **Resource data source for v1** — seed ~30 national + a handful of regional rows so the Hub isn't empty, then let Admin add more? Or wait and only show "no resources found" until admin adds them?
2. **Bulk Buying "Checkout with Instacart"** — per-item (one Instacart cart per staple, lots of taps) or a single cart with checkboxes for all selected staples? The mockup looks per-item; I'll default to that unless you say otherwise.
3. **Recipe photos** — the generator already returns `imageUrl` from Gemini; if you're seeing blank cards in production, do you want me to (a) just verify the pipeline, or (b) add a server-side fallback that fetches a stock photo by recipe name when `imageUrl` is missing?

Reply with answers (or "go with your defaults") and I'll start with the DB migration.