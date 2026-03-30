-- Remove sample menu categories, keep real pizzeria-chiari ones
-- Fix sort_order and emojis

DO $$
DECLARE bid uuid;
BEGIN
  SELECT id INTO bid FROM businesses WHERE slug = 'lapiazzetta';

  -- Delete the 6 sample categories we seeded (fake data)
  DELETE FROM menu WHERE business_id = bid AND category IN (
    'Pizze Classiche', 'Pizze Speciali', 'Pizza Bianca',
    'Antipasti', 'Dolci', 'Bevande'
  );

  -- Fix sort_order and emojis for the real categories
  UPDATE menu SET sort_order = 0, emoji = '🍕' WHERE business_id = bid AND category = 'Pizza';
  UPDATE menu SET sort_order = 1, emoji = '🍕' WHERE business_id = bid AND category = 'PIZZE FAMIGLIA';
  UPDATE menu SET sort_order = 2, emoji = '⭐' WHERE business_id = bid AND category = 'PIZZE SPECIALI';
  UPDATE menu SET sort_order = 3, emoji = '🫓' WHERE business_id = bid AND category = 'FOCACCE';
  UPDATE menu SET sort_order = 4, emoji = '🌯' WHERE business_id = bid AND category = 'PIADINE';
  UPDATE menu SET sort_order = 5, emoji = '🍔' WHERE business_id = bid AND category = 'PANINI HAMBURGER GALLETTO';
  UPDATE menu SET sort_order = 6, emoji = '🍤' WHERE business_id = bid AND category = 'FRITTO';
  UPDATE menu SET sort_order = 7, emoji = '🥤' WHERE business_id = bid AND category = 'BEVANDE';

  RAISE NOTICE 'Done';
END;
$$;

-- Verify
SELECT category, emoji, jsonb_array_length(items) as items, sort_order
FROM menu
WHERE business_id = (SELECT id FROM businesses WHERE slug = 'lapiazzetta')
ORDER BY sort_order;
