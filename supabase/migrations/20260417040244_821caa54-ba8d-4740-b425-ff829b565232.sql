
-- Phase D: Migrate recipes.ingredients (JSONB string array) into recipe_ingredients join table.
-- Adds a unique index for idempotent UPSERT, then runs a PL/pgSQL block to parse and insert.

CREATE UNIQUE INDEX IF NOT EXISTS recipe_ingredients_recipe_ingredient_unique
  ON public.recipe_ingredients (recipe_id, ingredient_id);

DO $$
DECLARE
  rec RECORD;
  line_text TEXT;
  idx INT;
  parsed_qty NUMERIC;
  parsed_unit TEXT;
  parsed_name TEXT;
  matched_id UUID;
  tokens TEXT[];
  first_tok TEXT;
  second_tok TEXT;
  unit_candidate TEXT;
  remaining TEXT;
  frac_parts TEXT[];
  unit_set TEXT[] := ARRAY['cup','tbsp','tablespoon','tsp','teaspoon','oz','ounce','lb','pound',
    'g','gram','kg','ml','l','liter','clove','can','package','packet','slice','piece','pinch',
    'dash','stick','head','bunch','jar','bottle'];
BEGIN
  -- Wipe existing rows for clean re-run
  DELETE FROM public.recipe_ingredients;

  FOR rec IN SELECT id, ingredients FROM public.recipes WHERE jsonb_typeof(ingredients) = 'array' LOOP
    idx := 0;
    FOR line_text IN SELECT jsonb_array_elements_text(rec.ingredients) LOOP
      line_text := trim(line_text);
      IF line_text = '' THEN CONTINUE; END IF;

      tokens := regexp_split_to_array(line_text, '\s+');
      parsed_qty := NULL;
      parsed_unit := NULL;
      first_tok := tokens[1];

      -- Mixed fraction "1 1/2"
      IF array_length(tokens,1) >= 2 AND first_tok ~ '^\d+$' AND tokens[2] ~ '^\d+/\d+$' THEN
        frac_parts := string_to_array(tokens[2], '/');
        parsed_qty := first_tok::numeric + (frac_parts[1]::numeric / NULLIF(frac_parts[2]::numeric,0));
        remaining := array_to_string(tokens[3:array_length(tokens,1)], ' ');
      ELSIF first_tok ~ '^\d+/\d+$' THEN
        frac_parts := string_to_array(first_tok, '/');
        parsed_qty := frac_parts[1]::numeric / NULLIF(frac_parts[2]::numeric,0);
        remaining := array_to_string(tokens[2:array_length(tokens,1)], ' ');
      ELSIF first_tok ~ '^\d+(\.\d+)?$' THEN
        parsed_qty := first_tok::numeric;
        remaining := array_to_string(tokens[2:array_length(tokens,1)], ' ');
      ELSE
        remaining := line_text;
      END IF;

      -- Try to extract unit
      tokens := regexp_split_to_array(remaining, '\s+');
      IF array_length(tokens,1) >= 1 THEN
        unit_candidate := lower(regexp_replace(tokens[1], '[.,]', '', 'g'));
        IF right(unit_candidate,1) = 's' THEN
          unit_candidate := left(unit_candidate, length(unit_candidate)-1);
        END IF;
        IF unit_candidate = ANY(unit_set) THEN
          parsed_unit := unit_candidate;
          remaining := array_to_string(tokens[2:array_length(tokens,1)], ' ');
        END IF;
      END IF;

      -- Strip prep notes after first comma; lowercase for matching
      parsed_name := lower(trim(split_part(remaining, ',', 1)));
      IF parsed_name = '' THEN
        idx := idx + 1;
        CONTINUE;
      END IF;

      -- Match: exact, then contains either way, then any 4+ char word
      SELECT i.ingredient_id INTO matched_id FROM public.ingredients i
        WHERE lower(i.ingredient_name) = parsed_name LIMIT 1;

      IF matched_id IS NULL THEN
        SELECT i.ingredient_id INTO matched_id FROM public.ingredients i
          WHERE parsed_name LIKE '%' || lower(i.ingredient_name) || '%'
             OR lower(i.ingredient_name) LIKE '%' || parsed_name || '%'
          ORDER BY length(i.ingredient_name) DESC LIMIT 1;
      END IF;

      IF matched_id IS NULL THEN
        SELECT i.ingredient_id INTO matched_id FROM public.ingredients i
          WHERE EXISTS (
            SELECT 1 FROM regexp_split_to_table(parsed_name, '\s+') AS w(word)
            WHERE length(word) > 3 AND lower(i.ingredient_name) LIKE '%' || word || '%'
          ) LIMIT 1;
      END IF;

      IF matched_id IS NOT NULL THEN
        INSERT INTO public.recipe_ingredients (recipe_id, ingredient_id, quantity, unit, display_text, sort_order)
        VALUES (rec.id, matched_id, parsed_qty, parsed_unit, line_text, idx)
        ON CONFLICT (recipe_id, ingredient_id) DO UPDATE
          SET quantity = COALESCE(public.recipe_ingredients.quantity, EXCLUDED.quantity),
              unit = COALESCE(public.recipe_ingredients.unit, EXCLUDED.unit),
              display_text = public.recipe_ingredients.display_text || ' + ' || EXCLUDED.display_text;
      END IF;

      idx := idx + 1;
    END LOOP;
  END LOOP;
END $$;
