# Kroger Certification API Integration

A phased rollout that wires Kroger's Certification (Sandbox) API into Help The Hive end-to-end, with a clean switch to Production later. Strictly Kroger-only — no scraping, no competitor comparisons (also keeps us aligned with the Instacart Connect compliance rule).

## Phase 1 — Environment & Secrets

Add Supabase secrets (I will request them via the secrets prompt — you paste values, they are never stored in code):

- `KROGER_CERT_CLIENT_ID`
- `KROGER_CERT_CLIENT_SECRET`
- `KROGER_PROD_CLIENT_ID` (optional now, placeholder)
- `KROGER_PROD_CLIENT_SECRET` (optional now, placeholder)
- `KROGER_ENV` = `certification` (single switch; flip to `production` later — no code change)

A shared edge helper `_shared/kroger.ts` reads `KROGER_ENV` and selects:

```text
certification → https://api-ce.kroger.com/v1
production    → https://api.kroger.com/v1
```

## Phase 2 — OAuth

Two OAuth flows, both Kroger-standard:

1. **Client-credentials** (server-to-server) for catalog/locations/pricing. Cached in `kroger_access_tokens` (service-role only), auto-refreshed before expiry.
2. **Authorization-code** for per-user account linking. Connect / Disconnect / Reconnect flows from the user settings page. Tokens encrypted at rest in `kroger_user_tokens`, scoped to `auth.uid()`.

Edge functions:
- `kroger-oauth-start` — builds authorize URL
- `kroger-oauth-callback` — exchanges code, stores tokens
- `kroger-oauth-disconnect`

## Phase 3 — Store Lookup

Edge function `kroger-locations` accepting `{ zip?, city?, state?, radiusInMiles? }`. Results cached in `kroger_locations` for 30 days. User picks a "home Kroger store" → stored on `profiles.kroger_location_id`.

UI: a store-picker on the meal-plan setup screen (Kroger-only; no other retailers shown).

## Phase 4 — Product Search & Matching

Edge function `kroger-product-search` for ad-hoc lookups, plus `kroger-match-grocery-list` that:

1. Reads a grocery list.
2. For each item, queries Kroger `/products` with the user's `locationId` (so prices are store-specific).
3. Picks the best match (exact UPC > brand+size > top-ranked).
4. Writes to `kroger_product_matches` with confidence score.
5. Caches the product + price in `kroger_pricing_cache` (TTL 24h).

## Phase 5 — Grocery List & Budget Integration

When a meal plan is generated, after the existing grocery list is built we:

1. Run Kroger match for every item.
2. Compute `kroger_estimated_total` from `regularPrice` (and `promoPrice` when present).
3. Compare to `profiles.weekly_budget`:
   - Estimated Total
   - Remaining Budget
   - Over Budget (red banner if > 0)
4. Show per-item: product name, brand, size, image, price, availability.

This replaces the 1.35 waste multiplier for Kroger users — real store prices flow straight through.

## Phase 6 — Database Schema

New tables (all with `GRANT` + RLS, `service_role` full access, users scoped to `auth.uid()`):

- `kroger_locations` — locationId, name, address, city, state, zip, lat/lng, hours, cached_at
- `kroger_products` — productId, upc, name, brand, size, image_url, category, last_seen_at
- `kroger_product_matches` — user_id, grocery_list_item_id, productId, confidence, matched_at
- `kroger_pricing_cache` — productId, locationId, regular_price, promo_price, currency, fetched_at (unique on productId+locationId)
- `kroger_access_tokens` — service-role only; client-credentials token + expiry
- `kroger_user_tokens` — per-user OAuth tokens (encrypted), refresh handling

## Phase 7 — Admin Dashboard

New `/admin/kroger` page (gated by `manage_marketing` or a new `manage_kroger` permission) showing:

- API status (last successful call, current env badge: **CERTIFICATION** / **PRODUCTION**)
- OAuth status (client-credentials token TTL, count of linked users)
- Product match stats (matched / failed last 7 days)
- Last sync time per cache table
- Button to force-refresh client-credentials token

## Out of Scope (explicitly)

- Walmart, Aldi, Dollar General, SerpApi, Open Prices, or any competitor pricing.
- Real Instacart cart sync (separate flow, Instacart Connect).
- Production credentials use — Certification only until Kroger approves Production.

## Technical Notes

- All Kroger calls go through edge functions; the browser never sees Kroger credentials.
- `kroger_pricing_cache` TTL is configurable per env (Cert: 1h to test refresh, Prod: 24h).
- Existing `package_prices` table remains as a fallback when a user has no Kroger store selected.
- Switching `KROGER_ENV` from `certification` → `production` later requires only updating the secret and bumping cache; no code changes.

## What I Need From You To Start

1. Confirm this plan (or tell me to trim/expand any phase).
2. After confirmation, I'll trigger the secrets prompt for `KROGER_CERT_CLIENT_ID` and `KROGER_CERT_CLIENT_SECRET` (and the prod placeholders if you have them).
3. Your Kroger OAuth redirect URI to register in their developer portal — I'll generate it as `https://<project>.supabase.co/functions/v1/kroger-oauth-callback` once you approve.
