
# Kroger Real-Time Pricing & Admin Sync Panel

## Overview
Integrate Kroger's live product data (prices, promos, images) throughout the app so families see exact, real-time costs and sale prices on their grocery lists.

## Phase 1: Admin Kroger Sync Panel
Build a new section in the admin dashboard to manage Kroger product syncing:
- **Store Finder**: Enter ZIP code → see nearby Kroger locations
- **Product Search & Sync**: Search products by keyword, preview results with prices/images, then sync to database
- **Bulk Sync**: One-click sync for common grocery staples (milk, eggs, bread, chicken, rice, beans, butter, cheese, ground beef, pasta, etc.)
- **Sync Logs**: View history of past syncs (success/fail counts, timestamps)

## Phase 2: Sync Common Grocery Items to Database
- Trigger a bulk sync of ~15-20 common grocery categories into `retailer_products` and `store_product_prices` tables
- Store Kroger product images (`image_url` from their API) alongside each product
- Track promo/sale prices separately from regular prices

## Phase 3: Wire Real-Time Prices into Grocery List
- When a user views their grocery list, match each ingredient to synced Kroger products
- Display real-time prices including **regular price** and **sale/promo price** when available
- Show a sale badge or strikethrough on discounted items
- Use Kroger product images on the grocery list items
- Calculate accurate totals based on real prices

## Phase 4: Kroger Product Images
- Yes — the Kroger API returns product image URLs that we can use directly
- Images will be displayed on grocery list items, product search results, and the admin sync panel
- No need to download/store images; we'll hotlink from Kroger's CDN

## Technical Notes
- All prices pulled via the Kroger Certification API (`api-ce.kroger.com`)
- Product images come from `product.images[].sizes[]` in the API response
- Sale prices detected via `promo` field in price data
- Edge function already handles auth, search, and sync logic
