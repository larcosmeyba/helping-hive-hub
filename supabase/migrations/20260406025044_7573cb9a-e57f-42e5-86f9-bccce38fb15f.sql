
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS children_ages text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS infant_formula boolean DEFAULT null;
