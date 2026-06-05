UPDATE public.ai_config SET enabled = true, provider = 'openai', model = 'gpt-5.4-mini', updated_at = now();
INSERT INTO public.ai_config (provider, model, enabled)
SELECT 'openai', 'gpt-5.4-mini', true
WHERE NOT EXISTS (SELECT 1 FROM public.ai_config);