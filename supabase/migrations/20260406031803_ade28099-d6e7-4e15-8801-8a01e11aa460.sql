INSERT INTO storage.buckets (id, name, public) VALUES ('brand-assets', 'brand-assets', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access on brand assets" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'brand-assets');