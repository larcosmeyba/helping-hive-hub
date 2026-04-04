
## What Already Exists
- 14-step questionnaire covering location, household, budget, stores, food prefs, allergies, cooking style, equipment, pantry, goals, eligibility, and verification upload
- Profiles table with household_size, weekly_budget, zip_code, preferred_stores, eligibility_category, verification_status, questionnaire_completed
- Admin analytics dashboard with type/store/goal breakdowns
- Settings page with profile editing
- Activity logs table for event tracking

## What Needs to Change

### Priority 1: Database + Onboarding

**Migration: Add 3 new columns to profiles**
- `referral_source` (text, nullable)
- `onboarding_completed_at` (timestamptz, nullable)
- `beta_user` (boolean, default true)

**Rebuild Questionnaire → 8 clean screens**
1. Welcome / intro screen
2. Household size (1–8+)
3. Weekly grocery budget (numeric input)
4. ZIP code (with location auto-detect — keep existing logic)
5. Preferred grocery stores (expanded list per spec)
6. User type / eligibility (simplified — no upload, no verification, just tracking)
7. How did you hear about us? (optional, new)
8. Completion / success screen ("Welcome to Help the Hive Beta")

Key changes from current:
- Remove steps 5-11 (food prefs, allergies, cooking time/style, meal repetition, equipment, pantry, goals) — these are great but move them to *after* onboarding as optional profile enrichment, keeping onboarding fast
- Remove verification upload from onboarding entirely
- Store user_type as normalized values (snap, teacher, student, military, first_responder, general)
- Auto-save progress between steps
- Map `eligibility_category` → `user_type` field usage

### Priority 2: Beta Badge + Settings Updates

**Beta badge**: Add subtle "Beta" indicator in dashboard header
**Eligibility verification placeholder**: New section in Settings showing status + "coming soon" message
**Profile editing**: Ensure all new fields are editable in Settings (referral_source won't be editable, but household/budget/zip/stores/user_type will be)

### Priority 3: Analytics Events + Admin

**Analytics events**: Log to `activity_logs` table:
- onboarding_started, onboarding_step_completed, onboarding_completed
- user_type_selected, preferred_store_selected

**Admin dashboard**: Add referral source breakdown and beta user count cards to existing AdminAnalytics page
