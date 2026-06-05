
-- AI config table
CREATE TABLE public.ai_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'openai',
  model text NOT NULL DEFAULT 'gpt-5.4-mini',
  enabled boolean NOT NULL DEFAULT false,
  system_prompt text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_config TO authenticated;
GRANT ALL ON public.ai_config TO service_role;

ALTER TABLE public.ai_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read ai_config"
  ON public.ai_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage ai_config"
  ON public.ai_config FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_ai_config_updated_at
  BEFORE UPDATE ON public.ai_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.ai_config (provider, model, enabled, notes)
  VALUES ('openai', 'gpt-5.4-mini', false, 'Default config — flip enabled=true after API key is added.');

-- AI request log
CREATE TABLE public.ai_request_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  request_type text NOT NULL,
  model_used text,
  provider text,
  status text NOT NULL DEFAULT 'pending',
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  latency_ms integer,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_request_log TO authenticated;
GRANT ALL ON public.ai_request_log TO service_role;

ALTER TABLE public.ai_request_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ai logs"
  ON public.ai_request_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all ai logs"
  ON public.ai_request_log FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX idx_ai_request_log_user_id ON public.ai_request_log(user_id);
CREATE INDEX idx_ai_request_log_request_type ON public.ai_request_log(request_type);
CREATE INDEX idx_ai_request_log_created_at ON public.ai_request_log(created_at DESC);
