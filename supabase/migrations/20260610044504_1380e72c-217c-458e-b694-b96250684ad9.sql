
CREATE TABLE IF NOT EXISTS public.plaid_link_sessions (
  link_token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plaid_link_sessions TO authenticated;
GRANT ALL ON public.plaid_link_sessions TO service_role;
ALTER TABLE public.plaid_link_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own link sessions" ON public.plaid_link_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
