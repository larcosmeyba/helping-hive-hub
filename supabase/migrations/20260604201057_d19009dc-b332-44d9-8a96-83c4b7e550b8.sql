
ALTER TABLE public.grocery_list_items
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS selected_for_instacart BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS source_ref_id UUID;

CREATE INDEX IF NOT EXISTS idx_grocery_list_items_user_source
  ON public.grocery_list_items (user_id, source_type);

CREATE INDEX IF NOT EXISTS idx_grocery_list_items_user_list
  ON public.grocery_list_items (user_id, grocery_list_id);
