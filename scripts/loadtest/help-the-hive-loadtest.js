// =============================================================================
// Help The Hive — Viral-Surge Load Test (k6)
// =============================================================================
//
// Adapted from the reference handoff. Preserved as-is:
//   • 3 scenarios (browse / meal_plan / signup_burst)
//   • thresholds, custom metrics, 429 + Retry-After verification
//   • JWT-pool support and AI-stub mode
//
// CHANGES vs the reference (called out for review):
//   1. browse query — confirmed against the real `grocery_price_reference`
//      table (columns ingredient_key, display_name, category, unit, avg_price,
//      low_price, high_price). No change to column names; kept category
//      filter list aligned with rows actually present.
//   2. meal_plan payload — `generate-meal-plan` accepts either a flat body or
//      `{ overrides: {...} }`; switched to the `overrides` wrapper because
//      that's the documented shape and what the client sends.
//      Fields kept: budget, household_size. Removed `days` (engine is hard-
//      coded to a 6-day batch cook) and `dietary_preferences: ['none']`
//      (real client omits the field when empty; sending `['none']` would be
//      treated as a literal preference).
//   3. signup payload — unchanged ({ email, password }), matches the
//      Supabase auth signup endpoint that AuthContext.signUp wraps.
//   4. AI-stub server side — wired in two edge functions:
//        - generate-meal-plan  (skips OpenAI, uses buildServerFallback)
//        - process-hive-ai-request (skips OpenAI, returns mockResponse)
//      Both gated by env LOADTEST_STUB_ALLOWED=true (staging only) AND the
//      header x-loadtest-stub: true. Auth, rate-limit RPC, context enrichment,
//      and DB writes still execute, so the load test exercises the real path.
//
// RUN
//   export SUPABASE_URL="https://YOUR-STAGING-ref.supabase.co"
//   export SUPABASE_ANON_KEY="eyJ...anon..."
//   export TEST_USER_JWTS="eyJ...t1...,eyJ...t2...,eyJ...t3..."
//   export STUB_AI="true"
//   export TARGET_VUS="200"   # start here, climb to 1000 / 5000
//   k6 run scripts/loadtest/help-the-hive-loadtest.js
// =============================================================================

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

const SUPABASE_URL = __ENV.SUPABASE_URL || 'https://YOUR-STAGING-ref.supabase.co';
const ANON_KEY     = __ENV.SUPABASE_ANON_KEY || 'PASTE_ANON_KEY';
const PEAK_VUS     = parseInt(__ENV.TARGET_VUS || '200', 10);
const STUB_AI      = (__ENV.STUB_AI || 'false').toLowerCase() === 'true';

const JWT_POOL = (__ENV.TEST_USER_JWTS || __ENV.TEST_USER_JWT || '')
  .split(',').map((s) => s.trim()).filter(Boolean);

const browseLatency   = new Trend('browse_latency_ms', true);
const mealPlanLatency = new Trend('meal_plan_latency_ms', true);
const rateLimited429  = new Counter('rate_limited_429');
const retryAfterOk    = new Rate('retry_after_header_present');
const serverErrors5xx = new Counter('server_errors_5xx');
const signupOutcomes  = new Counter('signup_outcomes');

export const options = {
  thresholds: {
    'browse_latency_ms': ['p(95)<500'],
    'meal_plan_latency_ms': ['p(95)<8000'],
    'http_req_failed': ['rate<0.01'],
    'server_errors_5xx': ['count<1'],
    'retry_after_header_present': ['rate>0.99'],
  },
  scenarios: {
    browse: {
      executor: 'ramping-vus', exec: 'browse', startVUs: 0,
      stages: [
        { duration: '1m', target: Math.ceil(PEAK_VUS * 0.7) },
        { duration: '3m', target: Math.ceil(PEAK_VUS * 0.7) },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    meal_plan: {
      executor: 'ramping-vus', exec: 'mealPlan', startVUs: 0,
      stages: [
        { duration: '1m', target: Math.ceil(PEAK_VUS * 0.2) },
        { duration: '3m', target: Math.ceil(PEAK_VUS * 0.2) },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    signup_burst: {
      executor: 'ramping-vus', exec: 'signup', startVUs: 0,
      stages: [
        { duration: '30s', target: Math.ceil(PEAK_VUS * 0.1) },
        { duration: '2m',  target: Math.ceil(PEAK_VUS * 0.1) },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
};

function recordCommon(res) {
  if (res.status >= 500) serverErrors5xx.add(1);
  if (res.status === 429) {
    rateLimited429.add(1);
    const hasRetry = !!(res.headers['Retry-After'] || res.headers['retry-after']);
    retryAfterOk.add(hasRetry);
  }
}

// Categories observed in grocery_price_reference seed data.
const CATEGORIES = ['produce', 'protein', 'dairy', 'pantry', 'spices', 'beverages', 'frozen', 'snacks'];

// -----------------------------------------------------------------------------
// 1) BROWSE — anonymous reads of grocery_price_reference
// -----------------------------------------------------------------------------
export function browse() {
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const url = `${SUPABASE_URL}/rest/v1/grocery_price_reference` +
    `?select=ingredient_key,display_name,category,unit,avg_price,low_price,high_price` +
    `&category=eq.${category}&order=display_name.asc&limit=100`;

  const res = http.get(url, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    tags: { name: 'browse_prices' },
  });

  browseLatency.add(res.timings.duration);
  recordCommon(res);
  check(res, {
    'browse: 200 OK': (r) => r.status === 200,
    'browse: rows array returned': (r) => {
      try { return Array.isArray(r.json()); } catch (_) { return false; }
    },
  });
  sleep(Math.random() * 3 + 1);
}

// -----------------------------------------------------------------------------
// 2) MEAL_PLAN — authenticated, expensive endpoint
//    Uses a rotating JWT pool so we test the 200 path (under per-user 10/hr cap)
//    instead of immediately tripping the 429 with a single token.
//    With STUB_AI=true, the edge function skips the real model call.
// -----------------------------------------------------------------------------
export function mealPlan() {
  if (JWT_POOL.length === 0) { sleep(1); return; }
  const jwt = JWT_POOL[(__VU + __ITER) % JWT_POOL.length];

  const url = `${SUPABASE_URL}/functions/v1/generate-meal-plan`;
  // generate-meal-plan accepts `{ overrides: {...} }`. Allergies and dietary
  // preferences come from the seeded user profile, not the request body.
  const payload = JSON.stringify({
    overrides: {
      budget: 75,
      household_size: 2 + Math.floor(Math.random() * 4),
    },
  });

  const headers = {
    apikey: ANON_KEY,
    Authorization: `Bearer ${jwt}`,
    'Content-Type': 'application/json',
  };
  if (STUB_AI) headers['x-loadtest-stub'] = 'true';

  const res = http.post(url, payload, { headers, tags: { name: 'generate_meal_plan' }, timeout: '30s' });

  mealPlanLatency.add(res.timings.duration);
  recordCommon(res);
  check(res, {
    'meal_plan: 200 or clean 429': (r) => r.status === 200 || r.status === 429,
    'meal_plan: no 5xx': (r) => r.status < 500,
    'meal_plan: 429 carries retry_after_seconds JSON': (r) => {
      if (r.status !== 429) return true;
      try { return typeof r.json().retry_after_seconds === 'number'; } catch (_) { return false; }
    },
  });
  sleep(Math.random() * 2 + 1);
}

// -----------------------------------------------------------------------------
// 3) SIGNUP_BURST
// -----------------------------------------------------------------------------
export function signup() {
  const email = `loadtest_${randomString(12)}@example-staging.test`;
  const password = `Test!${randomString(10)}aA1`;

  const res = http.post(`${SUPABASE_URL}/auth/v1/signup`,
    JSON.stringify({ email, password }),
    { headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' }, tags: { name: 'signup' } });

  recordCommon(res);
  const bucket = res.status === 200 ? '200_ok'
               : res.status === 429 ? '429_throttled'
               : res.status >= 500  ? '5xx_error'
               : `other_${res.status}`;
  signupOutcomes.add(1, { outcome: bucket });

  check(res, {
    'signup: not a 5xx crash': (r) => r.status < 500,
    'signup: 200 / 400 / 429 (graceful)': (r) => [200, 400, 429].includes(r.status),
  });
  sleep(Math.random() * 2 + 1);
}
