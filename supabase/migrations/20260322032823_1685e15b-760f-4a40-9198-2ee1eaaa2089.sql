
-- Add new profile columns for expanded questionnaire
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS food_preferences text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS cooking_style text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS meal_repetition text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS kitchen_equipment text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS user_goals text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS eligibility_category text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS verification_badge text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS verification_verified_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS membership_tier text DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS membership_discount numeric DEFAULT 0;

-- Create verification documents table
CREATE TABLE IF NOT EXISTS public.verification_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  eligibility_category text NOT NULL,
  document_url text NOT NULL,
  document_type text NOT NULL,
  file_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text DEFAULT NULL,
  reviewed_by uuid DEFAULT NULL,
  reviewed_at timestamp with time zone DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;

-- Users can insert their own documents
CREATE POLICY "Users can upload verification docs"
ON public.verification_documents
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own documents
CREATE POLICY "Users can view own verification docs"
ON public.verification_documents
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all verification documents
CREATE POLICY "Admins can view all verification docs"
ON public.verification_documents
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Admins can update verification documents
CREATE POLICY "Admins can update verification docs"
ON public.verification_documents
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));

-- Create storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-documents', 'verification-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for verification documents
CREATE POLICY "Users can upload verification files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'verification-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own verification files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'verification-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can view all verification files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'verification-documents' AND is_admin(auth.uid()));
