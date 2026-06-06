
ALTER TABLE public.inventory_photos
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS location text;

DROP TRIGGER IF EXISTS update_inventory_photos_updated_at ON public.inventory_photos;
CREATE TRIGGER update_inventory_photos_updated_at
  BEFORE UPDATE ON public.inventory_photos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.scanned_inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inventory_photo_id uuid REFERENCES public.inventory_photos(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  normalized_item_name text,
  quantity text,
  unit text,
  category text,
  location text,
  confidence_score numeric,
  confirmed boolean NOT NULL DEFAULT false,
  rejected boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scanned_inventory_items TO authenticated;
GRANT ALL ON public.scanned_inventory_items TO service_role;

ALTER TABLE public.scanned_inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own scanned items"
  ON public.scanned_inventory_items
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_scanned_inventory_items_user ON public.scanned_inventory_items(user_id);
CREATE INDEX IF NOT EXISTS idx_scanned_inventory_items_photo ON public.scanned_inventory_items(inventory_photo_id);

CREATE TRIGGER update_scanned_inventory_items_updated_at
  BEFORE UPDATE ON public.scanned_inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
