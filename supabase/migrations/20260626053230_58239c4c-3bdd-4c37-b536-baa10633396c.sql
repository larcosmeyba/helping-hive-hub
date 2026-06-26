
UPDATE public.recipes
SET cost_per_serving = ROUND((cost_estimate / NULLIF(serving_size,0))::numeric, 2)
WHERE is_public = true AND cost_per_serving IS NULL
  AND cost_estimate IS NOT NULL AND serving_size IS NOT NULL AND serving_size > 0;

UPDATE public.recipes SET tags = ARRAY(
  SELECT DISTINCT unnest(
    COALESCE(tags, ARRAY[]::text[]) ||
    CASE WHEN 'V'     = ANY(tags) THEN ARRAY['vegetarian']    ELSE ARRAY[]::text[] END ||
    CASE WHEN 'Vegan' = ANY(tags) THEN ARRAY['vegan','vegetarian'] ELSE ARRAY[]::text[] END ||
    CASE WHEN 'GF'    = ANY(tags) THEN ARRAY['gluten_free']   ELSE ARRAY[]::text[] END ||
    CASE WHEN 'DF'    = ANY(tags) THEN ARRAY['dairy_free']    ELSE ARRAY[]::text[] END ||
    CASE WHEN 'N'     = ANY(tags) THEN ARRAY['contains_nuts'] ELSE ARRAY['nut_free'] END ||
    CASE WHEN 'HP'    = ANY(tags) THEN ARRAY['high_protein']  ELSE ARRAY[]::text[] END ||
    CASE WHEN 'LC'    = ANY(tags) THEN ARRAY['low_carb']      ELSE ARRAY[]::text[] END ||
    CASE WHEN 'Q'     = ANY(tags) THEN ARRAY['quick']         ELSE ARRAY[]::text[] END ||
    CASE WHEN 'MP'    = ANY(tags) THEN ARRAY['meal_prep']     ELSE ARRAY[]::text[] END
  )
) WHERE is_public = true AND tags IS NOT NULL;

UPDATE public.recipes
SET tags = ARRAY(SELECT DISTINCT unnest(tags || ARRAY['grab_and_go','no_cook']))
WHERE is_public = true AND meal_type = 'snack' AND COALESCE(cook_time_minutes, 0) = 0;

UPDATE public.recipes SET kid_friendly = true
WHERE is_public = true AND kid_friendly IS NOT TRUE
  AND (category ILIKE '%family%' OR category ILIKE '%kid%');

INSERT INTO public.recipes
  (title, description, category, meal_type, ingredients, instructions,
   cost_estimate, cost_per_serving, serving_size, cook_time_minutes, prep_time_minutes,
   calories, protein_g, carbs_g, fats_g, fiber_g,
   kid_friendly, is_public, is_active, source, tags)
VALUES
  ('Apple Slices with Cinnamon', 'Crisp apple wedges dusted with cinnamon.', 'Snacks', 'snack',
   '["1 medium apple","1/4 tsp cinnamon"]'::jsonb, '[]'::jsonb, 0.80, 0.80, 1, 0, 2, 95, 0.5, 25, 0.3, 4,
   true, true, true, 'curated', ARRAY['grab_and_go','no_cook','vegan','vegetarian','gluten_free','dairy_free','nut_free','kid_friendly','ultra_budget']),
  ('Banana', 'A ripe banana — nature''s perfect snack.', 'Snacks', 'snack',
   '["1 medium banana"]'::jsonb, '[]'::jsonb, 0.30, 0.30, 1, 0, 0, 105, 1.3, 27, 0.4, 3,
   true, true, true, 'curated', ARRAY['grab_and_go','no_cook','vegan','vegetarian','gluten_free','dairy_free','nut_free','kid_friendly','ultra_budget']),
  ('Baby Carrots & Hummus', 'Crunchy baby carrots with creamy hummus.', 'Snacks', 'snack',
   '["1 cup baby carrots","3 tbsp hummus"]'::jsonb, '[]'::jsonb, 1.25, 1.25, 1, 0, 2, 150, 4, 18, 7, 5,
   true, true, true, 'curated', ARRAY['grab_and_go','no_cook','vegan','vegetarian','gluten_free','dairy_free','nut_free','kid_friendly']),
  ('Greek Yogurt with Berries', 'Plain Greek yogurt topped with mixed berries.', 'Snacks', 'snack',
   '["3/4 cup plain Greek yogurt","1/2 cup mixed berries"]'::jsonb, '[]'::jsonb, 1.50, 1.50, 1, 0, 2, 160, 17, 18, 2, 3,
   true, true, true, 'curated', ARRAY['grab_and_go','no_cook','vegetarian','gluten_free','nut_free','high_protein','kid_friendly']),
  ('String Cheese', 'A stick of low-moisture mozzarella.', 'Snacks', 'snack',
   '["1 mozzarella string cheese stick"]'::jsonb, '[]'::jsonb, 0.50, 0.50, 1, 0, 0, 80, 7, 1, 6, 0,
   true, true, true, 'curated', ARRAY['grab_and_go','no_cook','vegetarian','gluten_free','nut_free','low_carb','high_protein','kid_friendly','ultra_budget']),
  ('Hard-Boiled Egg', 'A pre-boiled egg with a pinch of salt.', 'Snacks', 'snack',
   '["1 hard-boiled egg","pinch of salt"]'::jsonb, '[]'::jsonb, 0.40, 0.40, 1, 0, 0, 78, 6, 0.6, 5, 0,
   true, true, true, 'curated', ARRAY['grab_and_go','no_cook','vegetarian','gluten_free','dairy_free','nut_free','low_carb','high_protein','ultra_budget']),
  ('Cottage Cheese with Pineapple', 'Low-fat cottage cheese with pineapple chunks.', 'Snacks', 'snack',
   '["1/2 cup low-fat cottage cheese","1/2 cup pineapple chunks"]'::jsonb, '[]'::jsonb, 1.40, 1.40, 1, 0, 2, 140, 13, 18, 2, 1,
   true, true, true, 'curated', ARRAY['grab_and_go','no_cook','vegetarian','gluten_free','nut_free','high_protein']),
  ('Orange', 'A whole navel orange.', 'Snacks', 'snack',
   '["1 medium navel orange"]'::jsonb, '[]'::jsonb, 0.60, 0.60, 1, 0, 0, 62, 1.2, 15, 0.2, 3,
   true, true, true, 'curated', ARRAY['grab_and_go','no_cook','vegan','vegetarian','gluten_free','dairy_free','nut_free','kid_friendly','ultra_budget']),
  ('Grapes', 'A cool handful of seedless grapes.', 'Snacks', 'snack',
   '["1 cup seedless grapes"]'::jsonb, '[]'::jsonb, 1.00, 1.00, 1, 0, 0, 104, 1, 27, 0.2, 1,
   true, true, true, 'curated', ARRAY['grab_and_go','no_cook','vegan','vegetarian','gluten_free','dairy_free','nut_free','kid_friendly']),
  ('Rice Cake with Sunflower Seed Butter', 'A plain rice cake with sunflower seed butter.', 'Snacks', 'snack',
   '["1 plain rice cake","1 tbsp sunflower seed butter"]'::jsonb, '[]'::jsonb, 0.70, 0.70, 1, 0, 1, 130, 3, 12, 8, 1,
   true, true, true, 'curated', ARRAY['grab_and_go','no_cook','vegan','vegetarian','gluten_free','dairy_free','nut_free']),
  ('Whole-Grain Crackers & Cheese', 'A few whole-grain crackers with cheddar slices.', 'Snacks', 'snack',
   '["6 whole-grain crackers","1 oz cheddar cheese"]'::jsonb, '[]'::jsonb, 1.20, 1.20, 1, 0, 1, 200, 8, 18, 11, 2,
   true, true, true, 'curated', ARRAY['grab_and_go','no_cook','vegetarian','nut_free','kid_friendly']),
  ('Cherry Tomatoes & Mozzarella', 'Cherry tomatoes with mini fresh mozzarella balls.', 'Snacks', 'snack',
   '["1 cup cherry tomatoes","1 oz fresh mozzarella pearls"]'::jsonb, '[]'::jsonb, 1.60, 1.60, 1, 0, 2, 120, 7, 7, 7, 2,
   true, true, true, 'curated', ARRAY['grab_and_go','no_cook','vegetarian','gluten_free','nut_free','low_carb']),
  ('Edamame', 'Lightly salted shelled edamame.', 'Snacks', 'snack',
   '["1 cup shelled edamame","pinch of sea salt"]'::jsonb, '[]'::jsonb, 1.00, 1.00, 1, 0, 1, 188, 18, 14, 8, 8,
   true, true, true, 'curated', ARRAY['grab_and_go','no_cook','vegan','vegetarian','gluten_free','dairy_free','nut_free','high_protein']),
  ('Cucumber Slices with Tzatziki', 'Refreshing cucumber rounds with tzatziki dip.', 'Snacks', 'snack',
   '["1 cup cucumber slices","3 tbsp tzatziki"]'::jsonb, '[]'::jsonb, 1.30, 1.30, 1, 0, 3, 90, 4, 8, 5, 1,
   true, true, true, 'curated', ARRAY['grab_and_go','no_cook','vegetarian','gluten_free','nut_free','low_carb']),
  ('Bell Pepper Strips & Guacamole', 'Sweet pepper strips dipped in guacamole.', 'Snacks', 'snack',
   '["1 medium bell pepper","3 tbsp guacamole"]'::jsonb, '[]'::jsonb, 1.50, 1.50, 1, 0, 3, 130, 2, 13, 9, 5,
   true, true, true, 'curated', ARRAY['grab_and_go','no_cook','vegan','vegetarian','gluten_free','dairy_free','nut_free']),
  ('Pear', 'A juicy ripe pear.', 'Snacks', 'snack',
   '["1 medium pear"]'::jsonb, '[]'::jsonb, 0.80, 0.80, 1, 0, 0, 100, 0.6, 27, 0.3, 6,
   true, true, true, 'curated', ARRAY['grab_and_go','no_cook','vegan','vegetarian','gluten_free','dairy_free','nut_free','kid_friendly','ultra_budget']),
  ('Roasted Chickpeas', 'A handful of pre-roasted seasoned chickpeas.', 'Snacks', 'snack',
   '["1/3 cup roasted chickpeas"]'::jsonb, '[]'::jsonb, 0.60, 0.60, 1, 0, 0, 130, 6, 20, 3, 5,
   true, true, true, 'curated', ARRAY['grab_and_go','no_cook','vegan','vegetarian','gluten_free','dairy_free','nut_free','ultra_budget']),
  ('Popcorn (Air-Popped)', 'A bowl of plain air-popped popcorn.', 'Snacks', 'snack',
   '["3 cups air-popped popcorn","pinch of salt"]'::jsonb, '[]'::jsonb, 0.30, 0.30, 1, 0, 0, 90, 3, 19, 1, 3,
   true, true, true, 'curated', ARRAY['grab_and_go','no_cook','vegan','vegetarian','gluten_free','dairy_free','nut_free','kid_friendly','ultra_budget']),
  ('Trail Mix (Nut-Free)', 'Seeds, dried fruit, and roasted chickpeas mix.', 'Snacks', 'snack',
   '["2 tbsp pumpkin seeds","2 tbsp sunflower seeds","2 tbsp raisins","2 tbsp roasted chickpeas"]'::jsonb, '[]'::jsonb, 0.90, 0.90, 1, 0, 1, 200, 7, 22, 10, 4,
   true, true, true, 'curated', ARRAY['grab_and_go','no_cook','vegan','vegetarian','gluten_free','dairy_free','nut_free']),
  ('Yogurt Tube', 'A kids'' low-fat yogurt tube.', 'Snacks', 'snack',
   '["1 low-fat yogurt tube"]'::jsonb, '[]'::jsonb, 0.45, 0.45, 1, 0, 0, 60, 2, 11, 1, 0,
   true, true, true, 'curated', ARRAY['grab_and_go','no_cook','vegetarian','gluten_free','nut_free','kid_friendly','ultra_budget']),
  ('Mandarin Orange Cup', 'Single-serving cup of mandarin oranges in juice.', 'Snacks', 'snack',
   '["1 mandarin orange cup in 100% juice"]'::jsonb, '[]'::jsonb, 0.70, 0.70, 1, 0, 0, 70, 1, 17, 0, 1,
   true, true, true, 'curated', ARRAY['grab_and_go','no_cook','vegan','vegetarian','gluten_free','dairy_free','nut_free','kid_friendly','ultra_budget']),
  ('Whole-Grain Pretzels', 'A small bag of whole-grain pretzels.', 'Snacks', 'snack',
   '["1 oz whole-grain pretzels"]'::jsonb, '[]'::jsonb, 0.50, 0.50, 1, 0, 0, 110, 3, 23, 1, 2,
   true, true, true, 'curated', ARRAY['grab_and_go','no_cook','vegan','vegetarian','dairy_free','nut_free','kid_friendly','ultra_budget']),
  ('Avocado Half with Sea Salt', 'Half a ripe avocado with a pinch of sea salt.', 'Snacks', 'snack',
   '["1/2 ripe avocado","pinch of sea salt"]'::jsonb, '[]'::jsonb, 0.80, 0.80, 1, 0, 1, 160, 2, 9, 15, 7,
   true, true, true, 'curated', ARRAY['grab_and_go','no_cook','vegan','vegetarian','gluten_free','dairy_free','nut_free','low_carb']),
  ('Turkey & Cheese Roll-Ups', 'Sliced deli turkey rolled with cheddar.', 'Snacks', 'snack',
   '["3 slices deli turkey","1 oz cheddar cheese"]'::jsonb, '[]'::jsonb, 1.75, 1.75, 1, 0, 2, 180, 19, 2, 11, 0,
   true, true, true, 'curated', ARRAY['grab_and_go','no_cook','gluten_free','nut_free','low_carb','high_protein','kid_friendly']),
  ('Tuna Pouch with Crackers', 'A single-serve tuna pouch with whole-grain crackers.', 'Snacks', 'snack',
   '["1 tuna pouch (2.6 oz)","6 whole-grain crackers"]'::jsonb, '[]'::jsonb, 1.80, 1.80, 1, 0, 1, 200, 20, 18, 5, 2,
   true, true, true, 'curated', ARRAY['grab_and_go','no_cook','dairy_free','nut_free','high_protein']),
  ('Dried Apricots', 'A small handful of dried apricots.', 'Snacks', 'snack',
   '["1/4 cup dried apricots"]'::jsonb, '[]'::jsonb, 0.70, 0.70, 1, 0, 0, 80, 1, 21, 0, 3,
   true, true, true, 'curated', ARRAY['grab_and_go','no_cook','vegan','vegetarian','gluten_free','dairy_free','nut_free','kid_friendly']),
  ('Watermelon Cubes', 'A cup of chilled watermelon cubes.', 'Snacks', 'snack',
   '["1 cup watermelon cubes"]'::jsonb, '[]'::jsonb, 0.75, 0.75, 1, 0, 2, 46, 1, 12, 0.2, 1,
   true, true, true, 'curated', ARRAY['grab_and_go','no_cook','vegan','vegetarian','gluten_free','dairy_free','nut_free','kid_friendly','ultra_budget']),
  ('Olives & Feta', 'A small dish of olives with crumbled feta.', 'Snacks', 'snack',
   '["10 kalamata olives","1 oz feta cheese"]'::jsonb, '[]'::jsonb, 1.60, 1.60, 1, 0, 2, 170, 5, 4, 15, 1,
   true, true, true, 'curated', ARRAY['grab_and_go','no_cook','vegetarian','gluten_free','nut_free','low_carb']),
  ('Banana with Sunflower Seed Butter', 'Banana topped with a spoon of sunflower seed butter.', 'Snacks', 'snack',
   '["1 medium banana","1 tbsp sunflower seed butter"]'::jsonb, '[]'::jsonb, 0.70, 0.70, 1, 0, 1, 200, 4, 30, 9, 4,
   true, true, true, 'curated', ARRAY['grab_and_go','no_cook','vegan','vegetarian','gluten_free','dairy_free','nut_free','kid_friendly']),
  ('Blueberries', 'A cup of fresh blueberries.', 'Snacks', 'snack',
   '["1 cup fresh blueberries"]'::jsonb, '[]'::jsonb, 1.50, 1.50, 1, 0, 1, 85, 1, 21, 0.5, 4,
   true, true, true, 'curated', ARRAY['grab_and_go','no_cook','vegan','vegetarian','gluten_free','dairy_free','nut_free','kid_friendly']),
  ('Soy Milk Box', 'A single-serve unsweetened soy milk box.', 'Snacks', 'snack',
   '["1 cup unsweetened soy milk (8 oz box)"]'::jsonb, '[]'::jsonb, 0.75, 0.75, 1, 0, 0, 80, 7, 4, 4, 1,
   true, true, true, 'curated', ARRAY['grab_and_go','no_cook','vegan','vegetarian','gluten_free','dairy_free','nut_free','high_protein','kid_friendly']),
  ('Raisin Box', 'A mini-box of raisins.', 'Snacks', 'snack',
   '["1 mini box raisins (1.5 oz)"]'::jsonb, '[]'::jsonb, 0.30, 0.30, 1, 0, 0, 129, 1, 34, 0.2, 2,
   true, true, true, 'curated', ARRAY['grab_and_go','no_cook','vegan','vegetarian','gluten_free','dairy_free','nut_free','kid_friendly','ultra_budget']);
