
CREATE TABLE public.weekly_meal_questionnaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  breakfast_carbs text[] NOT NULL DEFAULT '{}',
  breakfast_proteins text[] NOT NULL DEFAULT '{}',
  breakfast_fats text[] NOT NULL DEFAULT '{}',
  breakfast_snacks text[] NOT NULL DEFAULT '{}',
  lunch_carbs text[] NOT NULL DEFAULT '{}',
  lunch_proteins text[] NOT NULL DEFAULT '{}',
  lunch_fats text[] NOT NULL DEFAULT '{}',
  lunch_snacks text[] NOT NULL DEFAULT '{}',
  dinner_carbs text[] NOT NULL DEFAULT '{}',
  dinner_proteins text[] NOT NULL DEFAULT '{}',
  dinner_fats text[] NOT NULL DEFAULT '{}',
  evening_snacks text[] NOT NULL DEFAULT '{}',
  vegetables text[] NOT NULL DEFAULT '{}',
  foods_to_avoid text NOT NULL DEFAULT '',
  allergies text[] NOT NULL DEFAULT '{}',
  extra_cart_items text NOT NULL DEFAULT '',
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_meal_questionnaires TO authenticated;
GRANT ALL ON public.weekly_meal_questionnaires TO service_role;

ALTER TABLE public.weekly_meal_questionnaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own weekly questionnaires"
  ON public.weekly_meal_questionnaires FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own weekly questionnaires"
  ON public.weekly_meal_questionnaires FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own weekly questionnaires"
  ON public.weekly_meal_questionnaires FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own weekly questionnaires"
  ON public.weekly_meal_questionnaires FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_weekly_meal_q_updated_at
  BEFORE UPDATE ON public.weekly_meal_questionnaires
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_weekly_meal_q_user_week ON public.weekly_meal_questionnaires (user_id, week_start DESC);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_weekly_questionnaire_at timestamptz;
