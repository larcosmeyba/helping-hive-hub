
-- plaid_connections
CREATE TABLE public.plaid_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  institution_name text,
  institution_id text,
  item_id text NOT NULL,
  access_token_encrypted text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plaid_connections TO authenticated;
GRANT ALL ON public.plaid_connections TO service_role;
ALTER TABLE public.plaid_connections ENABLE ROW LEVEL SECURITY;
-- Users can see/delete their own connection metadata; access token never leaves the server.
CREATE POLICY "Users view own plaid connections" ON public.plaid_connections FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own plaid connections" ON public.plaid_connections FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role manages plaid connections" ON public.plaid_connections FOR ALL TO service_role USING (true) WITH CHECK (true);

-- plaid_accounts
CREATE TABLE public.plaid_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plaid_connection_id uuid NOT NULL REFERENCES public.plaid_connections(id) ON DELETE CASCADE,
  account_id text NOT NULL,
  account_name text,
  account_type text,
  account_subtype text,
  mask text,
  connected boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, account_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plaid_accounts TO authenticated;
GRANT ALL ON public.plaid_accounts TO service_role;
ALTER TABLE public.plaid_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own plaid accounts" ON public.plaid_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own plaid accounts" ON public.plaid_accounts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role manages plaid accounts" ON public.plaid_accounts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- food_transactions
CREATE TABLE public.food_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plaid_transaction_id text NOT NULL,
  account_id text,
  merchant_name text,
  transaction_name text,
  amount numeric NOT NULL,
  date date NOT NULL,
  category text,
  normalized_category text NOT NULL,
  source text NOT NULL DEFAULT 'plaid',
  pending boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, plaid_transaction_id)
);
CREATE INDEX idx_food_tx_user_date ON public.food_transactions (user_id, date DESC);
CREATE INDEX idx_food_tx_user_cat ON public.food_transactions (user_id, normalized_category);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_transactions TO authenticated;
GRANT ALL ON public.food_transactions TO service_role;
ALTER TABLE public.food_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own food transactions" ON public.food_transactions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role manages food transactions" ON public.food_transactions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- food_budget_settings
CREATE TABLE public.food_budget_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  monthly_food_budget numeric NOT NULL DEFAULT 400,
  grocery_budget numeric,
  restaurant_budget numeric,
  coffee_budget numeric,
  food_delivery_budget numeric,
  budget_month date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, budget_month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_budget_settings TO authenticated;
GRANT ALL ON public.food_budget_settings TO service_role;
ALTER TABLE public.food_budget_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own food budget settings" ON public.food_budget_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- food_budget_summaries
CREATE TABLE public.food_budget_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month date NOT NULL,
  monthly_food_budget numeric,
  spent_total numeric NOT NULL DEFAULT 0,
  remaining_budget numeric NOT NULL DEFAULT 0,
  grocery_spending numeric NOT NULL DEFAULT 0,
  restaurant_spending numeric NOT NULL DEFAULT 0,
  coffee_spending numeric NOT NULL DEFAULT 0,
  food_delivery_spending numeric NOT NULL DEFAULT 0,
  other_food_spending numeric NOT NULL DEFAULT 0,
  budget_health_score integer NOT NULL DEFAULT 100,
  projected_month_end_spending numeric,
  potential_savings numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_budget_summaries TO authenticated;
GRANT ALL ON public.food_budget_summaries TO service_role;
ALTER TABLE public.food_budget_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own budget summaries" ON public.food_budget_summaries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role manages budget summaries" ON public.food_budget_summaries FOR ALL TO service_role USING (true) WITH CHECK (true);

-- budget_ai_insights
CREATE TABLE public.budget_ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month date NOT NULL,
  insight_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  estimated_savings numeric,
  related_category text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_budget_insights_user_month ON public.budget_ai_insights (user_id, month DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_ai_insights TO authenticated;
GRANT ALL ON public.budget_ai_insights TO service_role;
ALTER TABLE public.budget_ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own budget insights" ON public.budget_ai_insights FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own budget insights" ON public.budget_ai_insights FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role manages budget insights" ON public.budget_ai_insights FOR ALL TO service_role USING (true) WITH CHECK (true);

-- updated_at triggers
CREATE TRIGGER trg_plaid_connections_updated BEFORE UPDATE ON public.plaid_connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_plaid_accounts_updated BEFORE UPDATE ON public.plaid_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_food_transactions_updated BEFORE UPDATE ON public.food_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_food_budget_settings_updated BEFORE UPDATE ON public.food_budget_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_food_budget_summaries_updated BEFORE UPDATE ON public.food_budget_summaries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
