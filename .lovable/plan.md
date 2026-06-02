# Help The Hive — Free-For-All Rebrand & Cleanup

This is a large, cross-cutting change. I'll group the work into logical batches and ship them together. Before I start, a few notes so you know what to expect:

- The questionnaire (`src/pages/Questionnaire.tsx`) and footer/legal data (`src/pages/legal/legalPagesData.ts`) likely drive a lot of the gated copy and links. I'll audit them first and rewrite in place.
- Removing the verification system means deleting/disabling routes, admin pages (`AdminVerifications.tsx`), and any DB-backed verification logic. I'll keep the underlying tables intact (no destructive migration) but stop writing to or reading from them in the UI. If you want the tables dropped too, say the word.
- "Free · SNAP & WIC" badges and similar copy will be replaced with neutral "Free for everyone" framing while still acknowledging SNAP/EBT support.

## 1. Branding & positioning (sitewide copy)

Replace SNAP/WIC-exclusive language with inclusive "free for every family" messaging, while keeping SNAP/EBT as a supported use case.

Files:
- `src/components/home/HeroSection.tsx` — eyebrow + subhead
- `src/components/home/{WhoWeHelpSection,TrustSection,FeaturesSection,CTASection,MealPlanSection,RecipeShowcase}.tsx`
- `src/components/Footer.tsx`, `src/components/SiteFooter.tsx` brand summary
- `src/components/dashboard/TierBadge.tsx` → "Free for everyone"
- `src/pages/Signup.tsx`, `src/pages/Login.tsx`, `src/pages/About.tsx`
- `index.html` meta/OG copy, `public/llms.txt`
- Memory: update `mem://business/revenue-model` and core line to drop "SNAP & WIC families" framing where it implies exclusivity.

## 2. Meal/recipe label changes

- Find and replace "Recipe Family on SNAP $50 Budget" and similar SNAP-budget-only labels with one of:
  - "SNAP-Friendly Meal Plan"
  - "Budget-Friendly Meal Plan"
  - "Eligible for SNAP Purchases" (for individual items)
- Likely in `src/components/home/MealPlanSection.tsx`, `RecipeShowcase.tsx`, `SampleMealPlan.tsx`, and any admin special meal seeds.

## 3. Instacart + SNAP/EBT explainer + pricing disclaimer

New shared component `src/components/InstacartDisclaimer.tsx` with two variants:
- `variant="why-instacart"` — explains the SNAP/EBT partnership rationale, Trader Joe's example.
- `variant="pricing"` — the legal pricing disclaimer string.

Disclaimer text (verbatim):
> Prices shown in Help The Hive are estimated for budgeting purposes only. Final pricing, taxes, promotions, availability, and discounts are confirmed directly through Instacart at checkout.

Mount it near:
- Grocery totals (`GroceryListPage.tsx`)
- Recipe pricing / meal cards (`MealCard.tsx`, recipe detail)
- Meal plan totals (`MealPlanPage.tsx`, `DashboardHome.tsx` summary cards)
- Send-to-Instacart buttons (`SendToInstacartButton.tsx`, `SendRecipeToInstacartButton.tsx`, `InstacartCTAButton.tsx`)
- Landing page Instacart explainer block under MealPlanSection

## 4. Email routing → Marcos@helpthehive.com

Replace every `legal@`, `press@`, `support@`, `partnerships@` mailto with `marcos@helpthehive.com`.

Files (grep-driven sweep):
- `src/components/SiteFooter.tsx`
- `src/pages/legal/legalPagesData.ts` and any rendered legal pages
- `src/pages/{Press,Partners,Partnerships,About}.tsx`
- Edge functions/email templates that send to/from those addresses (recipient overrides only — sender domain stays the same)

## 5. Footer & resource section overhaul

Remove from `src/pages/legal/legalPagesData.ts` (and any nav):
- SNAP Program, First Responder Program, Teacher Program
- Verification Process, ID verification, eligibility verification

Replace with new educational resource pages (stub content via existing `LegalPage` renderer or new resource entries):
- How to Apply for SNAP Benefits
- How to Apply for EBT
- Housing Assistance Resources
- Food Assistance Resources
- Utility Assistance Resources
- Community Support Programs

Also reflect in `src/pages/dashboard/ResourceHubHome.tsx` categories where applicable (or add to `resource_categories` if seeded).

## 6. Verification system removal

UI/route removal:
- Delete `src/pages/admin/AdminVerifications.tsx` route registration (keep file or delete — I'll delete).
- Remove verification steps from `src/pages/Questionnaire.tsx`.
- Remove "verified user" badges, gating in dashboard widgets, eligibility chips in `MembershipEligibility` feature.
- Remove ID upload UI/components.

Data:
- Stop reading `verification_status`/eligibility flags in the UI.
- Tables left in place (non-destructive). I'll note this and you can request a drop migration later.

Memory update: remove `mem://features/membership-eligibility` reference from index, replace with a "free for everyone" note.

## 7. Questionnaire cleanup

Rewrite `src/pages/Questionnaire.tsx` step list to exactly:
1. Household size
2. Weekly grocery budget
3. Dietary restrictions
4. Preferred grocery stores
5. Meal preferences (cuisines)
6. Allergies
7. Family goals
8. Pantry usage
9. Location permissions (ZIP + permission prompt)

Drop: teacher/first responder/student/veteran/SNAP-status questions, ID upload, verification consent screens. Update the "11-step" memory note to the new count.

## 8. Disclaimer constants

Add `src/lib/disclaimers.ts` exporting:
- `INSTACART_PRICING_DISCLAIMER`
- `INSTACART_PARTNERSHIP_EXPLAINER`
- `STORE_AVAILABILITY_NOTE` (Trader Joe's example)

So copy stays consistent everywhere.

## What I will NOT touch unless you ask

- Database schema for verification tables (left intact; safe to drop later).
- Instacart edge function logic (already working per recent fixes).
- Native app shell / Capacitor config.
- Pricing/payment flows (none exist — app is free).

## Order of execution

1. Audit: grep for SNAP-exclusive copy, verification references, old email addresses.
2. Add shared `InstacartDisclaimer` + `disclaimers.ts`.
3. Rewrite questionnaire.
4. Sweep footer + legal pages + email routing.
5. Sweep landing/dashboard copy + meal labels.
6. Remove verification UI and admin route.
7. Drop disclaimer + Instacart explainer into all required surfaces.
8. Update memory.

Ready to execute on approval.