# Plaid Food Budget Dashboard

Build a secure, Plaid-powered budget feature scoped strictly to **food spending** (groceries, restaurants, coffee, food delivery, Instacart, other food). No income, debt, investments, or non-food data is stored or shown.

## Scope clarifications

- UI ships with **mock data** so the flow is usable today.
- Backend is structured for **real Plaid Transactions** the moment `PLAID_CLIENT_ID` / `PLAID_SECRET` / `PLAID_ENV` are added as secrets.
- Mock AI insights now; real OpenAI later (no key requested yet).
- Not added to bottom nav. Entry point = Home page "Budget Snapshot" card under existing cards.

## Database (one migration)

New tables (all RLS-scoped to `auth.uid() = user_id`, grants to `authenticated` + `service_role`):

- `plaid_connections` — institution + encrypted access token + item_id + status
- `plaid_accounts` — masked account metadata only (no full numbers)
- `food_transactions` — only food-categorized transactions; unique on `(user_id, plaid_transaction_id)`
- `food_budget_settings` — monthly + per-category budgets
- `food_budget_summaries` — per-month rollup with health score + projection
- `budget_ai_insights` — mock now, OpenAI-ready later

`access_token_encrypted` is `text` (encrypted server-side before insert; plaintext never leaves edge functions).

## Edge Functions

All JWT-validated via `getClaims`, CORS-enabled, food-only filters enforced server-side.

1. `create-plaid-link-token` — returns `link_token` for current user.
2. `exchange-plaid-public-token` — exchanges public token, stores encrypted access token + accounts.
3. `sync-plaid-transactions` — pulls `/transactions/sync`, filters to food PFC categories, upserts into `food_transactions`.
4. `categorize-food-transactions` — maps Plaid PFC + merchant heuristics → `groceries | restaurants | coffee_drinks | food_delivery | instacart | other_food`.
5. `calculate-budget-dashboard` — computes monthly totals, remaining, health score (0–100), projection, potential savings; upserts `food_budget_summaries`.
6. `disconnect-plaid-account` — removes Plaid item, deletes access token, optional purge of `food_transactions`.

All six gracefully short-circuit with a clear error when Plaid secrets are not yet configured, so the mock UI still works.

## Frontend pages & flow

Home page gets a new **Budget Snapshot** card below "Move With Your Meal Plan":
- Not connected → "Track Your Food Spending" + Connect button.
- Connected → budget / spent / remaining / health score + "View Full Budget Dashboard".

New routes under `/dashboard/budget/*`:

- `BudgetConnectPage` — trust points + Connect With Plaid CTA.
- `BudgetSyncingPage` — 5-step animated sync checklist.
- `BudgetDashboardPage` — overview: monthly budget, spent, remaining, health score, breakdown, insights, top categories, savings opportunities, recent transactions.
- `BudgetTransactionsPage` — filterable food transactions list (All / Groceries / Restaurants / Coffee / Food Delivery / Instacart).
- `BudgetInsightsPage` — mock insights + "Generate Savings Meal Plan" CTA → `/dashboard/meal-plan/setup` with budget prefilled.
- `BudgetGoalsPage` — set monthly + category goals.
- `BudgetSettingsPage` — disconnect Plaid, delete imported transactions, manage budgets, data usage copy.

Privacy disclosure copy is shown on Connect, Settings, and Data Usage screens:
> "Help The Hive only uses food-related transactions to help you understand grocery and restaurant spending. We do not display income, debt, investments, or unrelated purchases."

## Meal-plan integration

When `remaining_budget` drops below a threshold, dashboard shows a banner:
"You have $X remaining in your food budget this month. Generate a low-cost meal plan?" → `/dashboard/meal-plan/setup?budget=<remaining>`.

## Security

- Plaid keys only in Supabase Secrets.
- Access tokens encrypted at rest, never returned to the client.
- RLS on every new table; service_role used by edge functions only.
- No PII beyond what's needed (merchant, amount, date, category, plaid ids, masked account).

## Mock data behavior

If user has no `plaid_connections` row, frontend uses a deterministic mock summary so screenshots and the full flow render. The moment Plaid is connected, real data takes over with no UI changes.

## Out of scope this pass

- Real OpenAI insights (mock now; schema ready).
- Bottom nav entry (intentionally excluded).
- Goal automation/notifications (basic CRUD only).
