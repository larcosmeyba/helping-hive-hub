CREATE TABLE public.meal_plan_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  current_stage TEXT NOT NULL DEFAULT 'preparing',
  current_step TEXT,
  completed_steps TEXT[] NOT NULL DEFAULT '{}'::text[],
  status_message TEXT,
  error_code TEXT,
  error_message TEXT,
  fallback_used BOOLEAN NOT NULL DEFAULT false,
  meal_plan_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.meal_plan_generation_jobs TO authenticated;
GRANT ALL ON public.meal_plan_generation_jobs TO service_role;
ALTER TABLE public.meal_plan_generation_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own meal plan generation jobs"
ON public.meal_plan_generation_jobs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
CREATE TRIGGER update_meal_plan_generation_jobs_updated_at
BEFORE UPDATE ON public.meal_plan_generation_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();