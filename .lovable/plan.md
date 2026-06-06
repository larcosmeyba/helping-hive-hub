# Hive Family Assistance — Full Rebuild

Replace the current yes/no intake with a category-card flow, add results/detail/saved screens, and wire it to new database tables + edge functions that are OpenAI-ready but work without it.

## 1. Database (one migration)

New tables (with GRANTs + RLS):

- **family_assistance_requests** — `id, user_id, zip_code, selected_categories jsonb, urgency_level, household_size, has_children, employment_status, receives_benefits, timestamps`
- **community_resources** — `id, name, category, subcategory, description, address, city, state, zip_code, county, latitude, longitude, phone, website, email, hours, eligibility_notes, what_to_bring, emergency_available bool, source, last_verified_at, active bool, timestamps`
- **saved_family_resources** — `id, user_id, resource_id (-> community_resources), notes, created_at` (separate from existing `saved_resources` to avoid colliding with the legacy resource hub)
- **family_assistance_ai_recommendations** — `id, user_id, request_id, recommended_resource_ids jsonb, ai_summary, urgent_notes, next_steps jsonb, created_at`

RLS: user owns own requests/saves/recs; `community_resources` readable by authenticated; admins manage.

## 2. Edge Functions

- `find-family-resources` — saves request, queries `community_resources` (ZIP → county → state, urgency-first, category filter), calls `process-hive-ai-request` with `request_type: "family_assistance"`, stores recommendation, returns ranked list + AI summary. Graceful fallback if AI fails.
- `save-family-resource` — upsert into `saved_family_resources`.
- `get-saved-family-resources` — returns saved resources joined with `community_resources`.
- Extend `process-hive-ai-request` to handle `family_assistance` request type using the system prompt from the spec; returns `{summary, recommended_resources, urgent_notes, next_steps}`. Never invents resources — only ranks supplied candidates.

## 3. Frontend

New route tree under `/dashboard/family-assistance`:

- `FamilyAssistanceIntakePage.tsx` (rewrite) — Screen 1 (multi-select category cards) + urgency question + Screen 2 (ZIP, household, children, employment, benefits) as a 2-step flow. Replaces the legacy yes/no form.
- `FamilyAssistanceResultsPage.tsx` — ranked cards, filters chip row (Food/Housing/Utilities/Baby/Healthcare/Transport/Employment/Urgent/Saved), AI summary banner, safety disclaimers, 911/crisis copy when urgent or mental_health.
- `FamilyResourceDetailPage.tsx` — full resource detail with Call / Website / Directions / Save buttons.
- `FamilySavedResourcesPage.tsx` — saved tab.
- Home / hub entry: `Hive Family Assistance` card → `Find Help` routes to `/dashboard/family-assistance`; `Saved` link to saved page. Keep this fully separate from Hive AI.

Category cards use the 11 categories from the spec, with Lucide icons and the honey-themed flat tile style already used elsewhere in the dashboard.

## 4. Safety / Copy

- Disclaimer on results: "Resource availability, eligibility, hours, and services can change. Please contact the organization directly before visiting."
- Urgent banner: "If you or someone in your household is in immediate danger, call 911…"
- Mental-health crisis block (988) when category includes mental_health or urgent.
- AI-disabled fallback message: "AI recommendations are currently unavailable, but here are resources based on your ZIP code and selected needs."

## 5. Out of scope

- No Plaid, no SNAP verification, no eligibility gating, no ID upload.
- Existing `local_resources` / `FamilyAssistanceMatchesPage` legacy flow stays for now; new flow lives at `/dashboard/family-assistance/*` and is the only one linked from Home.
- Seeding `community_resources` is not part of this change — table starts empty and resources can be added via admin/manual insert.
