
ALTER TABLE public.pantry_items
  ADD COLUMN IF NOT EXISTS estimated_value numeric,
  ADD COLUMN IF NOT EXISTS manually_added boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS photo_detected boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS receipt_detected boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS checked_off boolean NOT NULL DEFAULT false;

ALTER TABLE public.pantry_items DROP CONSTRAINT IF EXISTS pantry_items_category_check;
ALTER TABLE public.pantry_items ADD CONSTRAINT pantry_items_category_check CHECK (
  category IS NULL OR category = ANY (ARRAY[
    'dairy','produce','protein','grains','pantry_staples','frozen','household','other',
    'proteins','vegetables','fruits','frozen_foods','canned_goods'
  ])
);
