
-- Phase 1 pricing scaffold: create empty reference tables.
-- These are read-only references populated by admins/ETL, not by end users.
-- Anyone signed in can read them so the client pricing service can do lookups.

CREATE TABLE public.grocery_price_reference (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ingredient_key TEXT NOT NULL,
  display_name TEXT,
  category TEXT,
  unit TEXT,
  avg_price NUMERIC(10,4),
  low_price NUMERIC(10,4),
  high_price NUMERIC(10,4),
  source TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (ingredient_key)
);
GRANT SELECT ON public.grocery_price_reference TO authenticated;
GRANT ALL ON public.grocery_price_reference TO service_role;
ALTER TABLE public.grocery_price_reference ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read grocery prices"
  ON public.grocery_price_reference FOR SELECT TO authenticated USING (true);

CREATE TABLE public.store_price_multipliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_code TEXT NOT NULL,
  store_name TEXT,
  multiplier NUMERIC(6,4) NOT NULL DEFAULT 1.0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (store_code)
);
GRANT SELECT ON public.store_price_multipliers TO authenticated;
GRANT ALL ON public.store_price_multipliers TO service_role;
ALTER TABLE public.store_price_multipliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read store multipliers"
  ON public.store_price_multipliers FOR SELECT TO authenticated USING (true);

CREATE TABLE public.state_price_multipliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  state_code TEXT NOT NULL,
  state_name TEXT,
  multiplier NUMERIC(6,4) NOT NULL DEFAULT 1.0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (state_code)
);
GRANT SELECT ON public.state_price_multipliers TO authenticated;
GRANT ALL ON public.state_price_multipliers TO service_role;
ALTER TABLE public.state_price_multipliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read state multipliers"
  ON public.state_price_multipliers FOR SELECT TO authenticated USING (true);

-- Shared updated_at trigger function (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_grocery_price_reference_updated_at
  BEFORE UPDATE ON public.grocery_price_reference
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_store_price_multipliers_updated_at
  BEFORE UPDATE ON public.store_price_multipliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_state_price_multipliers_updated_at
  BEFORE UPDATE ON public.state_price_multipliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
