# Help The Hive — k6 Load Test Runbook

**Run against STAGING only. Never production.**

The sandboxed exec env can't generate real load — run this from a laptop, a
small VM, or k6 Cloud.

## What changed vs the reference script

| Area | Status | Notes |
| --- | --- | --- |
| Scenarios (browse / meal_plan / signup_burst) | Unchanged | |
| Thresholds | Unchanged | |
| Custom metrics + 429 / Retry-After checks | Unchanged | |
| JWT pool (`TEST_USER_JWTS`) | Unchanged | rotates per `__VU + __ITER` |
| `browse` query | Confirmed | columns match `grocery_price_reference` |
| `mealPlan` payload | **Changed** | wrapped in `{ overrides: {...} }` (real shape); dropped `days` (engine is hard-coded 6 days) and the bogus `dietary_preferences: ['none']` (real client omits when empty; profile carries the real prefs) |
| `signup` payload | Unchanged | matches Supabase `/auth/v1/signup` |
| `STUB_AI` server side | **Wired** | see below |

## Server-side AI stub

Both expensive AI endpoints now honor `x-loadtest-stub: true`, gated by env:

- `supabase/functions/generate-meal-plan/index.ts` — skips the OpenAI call and
  uses the existing `buildServerFallback` recipe selector. Rate-limit RPC,
  profile/pantry reads, `meal_plan_generation_jobs` updates, `meal_plan_meals`
  inserts, and grocery-list generation **all still run**.
- `supabase/functions/process-hive-ai-request/index.ts` — same idea; skips
  `callOpenAI`, returns `mockResponse(request_type)`. Auth, rate-limit RPC,
  context enrichment, and `ai_request_log` writes still run.

**Enable on staging only:**

```
supabase secrets set LOADTEST_STUB_ALLOWED=true   # staging project
```

The header alone is not sufficient — without the env var the request goes to
the real model. **Do not set this secret on the production project.**

## Prereqs on staging (test window only)

1. Disable hCaptcha + raise/disable per-IP signup limit (single load-gen IP).
2. Keep per-user AI 10/hr caps **on** — we want those to trip on purpose.
3. Seed a pool of confirmed users, grab access tokens:

```
curl -s "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"loadtest1@example-staging.test","password":"<pw>"}' \
  | jq -r .access_token
```

## Run

```
export SUPABASE_URL="https://YOUR-STAGING-ref.supabase.co"
export SUPABASE_ANON_KEY="eyJ..."
export TEST_USER_JWTS="t1,t2,t3,t4,t5"
export STUB_AI="true"
export TARGET_VUS="200"        # start here, then 1000, then 5000
k6 run scripts/loadtest/help-the-hive-loadtest.js
```

## What to report after the run

- k6 summary: `browse_latency_ms p95`, `meal_plan_latency_ms p95`,
  `http_req_failed` rate, `server_errors_5xx` count, `retry_after_header_present` rate.
- Counts of 429s on `generate_meal_plan` and `signup`.
- Supabase dashboard during the run: DB CPU %, peak active connections, pooler
  saturation, and the VU level where any of those max out.
