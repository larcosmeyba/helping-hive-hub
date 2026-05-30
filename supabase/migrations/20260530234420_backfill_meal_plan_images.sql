-- Backfill imageUrl on meals inside meal_plans.plan_data by matching meal name
-- keywords to recipes.image_url. Uses a token-overlap heuristic in plpgsql.
DO $$
DECLARE
  plan RECORD;
  day_idx INT;
  meal_idx INT;
  day_obj JSONB;
  meals JSONB;
  meal JSONB;
  meal_name TEXT;
  found_url TEXT;
  new_plan JSONB;
  changed BOOLEAN;
BEGIN
  FOR plan IN
    SELECT id, plan_data FROM public.meal_plans
    WHERE plan_data ? 'weeklyPlan'
  LOOP
    new_plan := plan.plan_data;
    changed := FALSE;
    day_idx := 0;
    FOR day_obj IN SELECT * FROM jsonb_array_elements(new_plan->'weeklyPlan') LOOP
      meals := day_obj->'meals';
      meal_idx := 0;
      FOR meal IN SELECT * FROM jsonb_array_elements(COALESCE(meals,'[]'::jsonb)) LOOP
        IF (meal->>'imageUrl') IS NULL OR (meal->>'imageUrl') = '' THEN
          meal_name := lower(COALESCE(meal->>'name',''));
          -- pick the first recipe whose lowercased title shares any 4+ char token
          SELECT r.image_url INTO found_url
          FROM public.recipes r
          WHERE r.image_url IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM regexp_split_to_table(meal_name, '\s+') AS w(token)
              WHERE length(w.token) >= 4
                AND lower(r.title) LIKE '%' || w.token || '%'
            )
          ORDER BY length(r.title)
          LIMIT 1;
          IF found_url IS NULL THEN
            -- fallback: pick any recipe image
            SELECT r.image_url INTO found_url FROM public.recipes r
            WHERE r.image_url IS NOT NULL ORDER BY random() LIMIT 1;
          END IF;
          IF found_url IS NOT NULL THEN
            new_plan := jsonb_set(
              new_plan,
              ARRAY['weeklyPlan', day_idx::text, 'meals', meal_idx::text, 'imageUrl'],
              to_jsonb(found_url),
              true
            );
            new_plan := jsonb_set(
              new_plan,
              ARRAY['weeklyPlan', day_idx::text, 'meals', meal_idx::text, 'imageVerified'],
              to_jsonb(false),
              true
            );
            changed := TRUE;
          END IF;
        END IF;
        meal_idx := meal_idx + 1;
      END LOOP;
      day_idx := day_idx + 1;
    END LOOP;
    IF changed THEN
      UPDATE public.meal_plans SET plan_data = new_plan WHERE id = plan.id;
    END IF;
  END LOOP;
END $$;
