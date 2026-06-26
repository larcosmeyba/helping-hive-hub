# Project Memory

## Core
- Visual: Unified honey yellow (#F2B233/#F2A900), flat UI, no gradients. Honey cream shade (HSL 43 100% 96%) backgrounds. Apple-level premium feel.
- Tech: Supabase + Edge Functions + React (Vite: deduplicate 'react'). Gemini-2.5-flash-lite for 3s meal engine inference.
- Mobile: Native UI fills 100% width, locks viewport (viewport-fit=cover). Global safe-area-inset management without redundant padding.
- Recipes: High-quality food photography required for all recipes. No text-only recipes.
- Constraints: Ignore 'edge-runtime.d.ts' TS resolution errors in Supabase Edge Functions.
- State: 100% FREE for EVERYONE. App is for every family, not just SNAP/EBT. No paywalls, no subscriptions, no verification, no eligibility gating ever. We proudly support SNAP/EBT families. Revenue: retail affiliate (Kroger when approved) + sponsored brands + B2B/grants + Instacart affiliate.
- Legal: ALL contact emails route to marcos@helpthehive.com. Global tool disclaimer (planning/info only). Pricing disclaimer required near grocery totals/meal-plan totals/grocery CTAs: prices are estimates; final pricing confirmed at the user's store at checkout.
- Instacart: APPROVED for production (June 2026). Use official branding (dark green #003D29, carrot mark) for the "Shop with Instacart" CTA. Instacart is the ONLY user-facing fulfillment/checkout layer. FTC affiliate disclosure required beneath each CTA.
- Kroger: HIDDEN pricing backend only. No user-facing Kroger branding, connect flow, or "Shop at Kroger" CTA. All prices render as a neutral "Estimated total".
- Meal images: Render meal.imageUrl whenever it's non-empty (verified or unverified). Only show flat honey-cream ChefHat tile when no imageUrl exists. Never keyword-match stock photos.

## Memories
- [Instacart approved](mem://constraints/instacart-approved) — Instacart production-approved; branding + CTAs + handoff allowed
- [Revenue Model](mem://business/revenue-model) — 100% free forever, retail affiliate + sponsored brands + B2B + grants + Instacart affiliate
- [Project Description](mem://project/description) — Help The Hive platform overview and meal planning goals
- [Visual Identity](mem://style/visual-identity) — Brand colors, flat single-tone aesthetics, and premium native feel
- [Marketing Tone](mem://style/marketing-tone) — Investor-ready, mission-driven warmth, no AI-generated people
- [Branding Assets](mem://style/branding-assets) — Paths to logos, favicons, OG images, and Lucide icon usage
- [Motion Design](mem://style/motion-design) — Framer Motion staggered transitions and micro-animations
- [Navigation and Layout](mem://style/navigation-and-layout) — Native header alignment, tab styling, unified section spacing
- [Mobile Design System](mem://style/mobile-native-design-system) — 48px touch targets, safe-area management, native swiping cards
- [Tech Stack and AI](mem://tech/stack-and-ai) — Supabase Edge Functions and Gemini-2.5-flash-lite engine
- [Kroger hidden pricing backend](mem://constraints/kroger-hidden) — Kroger powers prices only; never user-facing
- [Grocery UI and UX](mem://features/grocery-ui-ux) — Category list + Shop with Instacart CTA + affiliate disclosure
