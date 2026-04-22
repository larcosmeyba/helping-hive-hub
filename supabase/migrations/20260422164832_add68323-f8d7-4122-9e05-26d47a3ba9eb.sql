-- SNAP benefit tracking: monthly allotment + balance per user
CREATE TABLE public.snap_benefit_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  month_start DATE NOT NULL,
  monthly_allotment NUMERIC NOT NULL DEFAULT 0,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  deposit_day INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, month_start)
);

ALTER TABLE public.snap_benefit_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own snap tracking"
ON public.snap_benefit_tracking FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all snap tracking"
ON public.snap_benefit_tracking FOR SELECT
USING (is_admin(auth.uid()));

CREATE TRIGGER update_snap_benefit_tracking_updated_at
BEFORE UPDATE ON public.snap_benefit_tracking
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SNAP purchase log: each grocery trip / purchase
CREATE TABLE public.snap_purchase_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  store_name TEXT,
  amount_spent NUMERIC NOT NULL DEFAULT 0,
  paid_with_snap NUMERIC NOT NULL DEFAULT 0,
  paid_with_other NUMERIC NOT NULL DEFAULT 0,
  meal_plan_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.snap_purchase_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own snap purchases"
ON public.snap_purchase_log FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all snap purchases"
ON public.snap_purchase_log FOR SELECT
USING (is_admin(auth.uid()));

CREATE INDEX idx_snap_purchase_log_user_date ON public.snap_purchase_log(user_id, purchase_date DESC);

-- User outcomes: weekly scoring of plan adherence, savings, waste
CREATE TABLE public.user_outcomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  budget_target NUMERIC,
  actual_spend NUMERIC,
  savings_amount NUMERIC DEFAULT 0,
  meals_cooked INTEGER DEFAULT 0,
  meals_planned INTEGER DEFAULT 0,
  adherence_score INTEGER DEFAULT 0,
  waste_reported BOOLEAN DEFAULT false,
  outcome_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

ALTER TABLE public.user_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own outcomes"
ON public.user_outcomes FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all outcomes"
ON public.user_outcomes FOR SELECT
USING (is_admin(auth.uid()));

CREATE TRIGGER update_user_outcomes_updated_at
BEFORE UPDATE ON public.user_outcomes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();