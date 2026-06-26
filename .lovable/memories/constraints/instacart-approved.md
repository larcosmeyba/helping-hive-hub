---
name: Instacart approved
description: Instacart Developer Platform is approved for production. Branding, CTAs, and handoff are allowed.
type: constraint
---
Instacart is APPROVED for production use as of June 2026.

Allowed (and expected):
- "Shop with Instacart" / "Shop ingredients" CTA on grocery pages (`ShopGroceriesPage`, `GroceryReviewPage`, `GrocerySummaryPage`).
- Official Instacart branding: dark green `#003D29` background, `#FAF1E5` text, full-color carrot mark, min 46px tall. Component: `src/components/grocery/ShopWithInstacartButton.tsx`.
- "Partnered with Instacart" mention in `SiteFooter` and `Partners` page.
- FTC affiliate disclosure beneath each Instacart CTA.
- Edge function `instacart-create-list` (production base `connect.instacart.com`) using `INSTACART_API_KEY` (prod) / `Instacart_API_KEY_DEVELOPMENT` (dev).

Roles:
- Kroger = HIDDEN pricing backend only (no user-facing branding).
- Instacart = the ONLY user-facing fulfillment/checkout layer.

Do not reintroduce the old "not approved" guard — it is obsolete.
