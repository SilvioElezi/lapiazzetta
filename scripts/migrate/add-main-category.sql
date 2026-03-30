-- Add main_category column to menu table
-- And seed default sections for lapiazzetta
-- Run in Supabase SQL Editor

ALTER TABLE menu ADD COLUMN IF NOT EXISTS main_category TEXT DEFAULT 'Pizzeria';

DO $$
DECLARE bid uuid;
BEGIN
  SELECT id INTO bid FROM businesses WHERE slug = 'lapiazzetta';
  IF bid IS NULL THEN RAISE EXCEPTION 'Business not found'; END IF;

  -- All current menu categories are under Pizzeria
  UPDATE menu SET main_category = 'Pizzeria' WHERE business_id = bid;

  -- Seed default sections in settings
  INSERT INTO settings (business_id, key, value)
  VALUES (
    bid,
    'sections',
    '[{"name":"Bar","emoji":"🍹"},{"name":"Pizzeria","emoji":"🍕"}]'::jsonb
  )
  ON CONFLICT (business_id, key) DO UPDATE SET value = EXCLUDED.value;

  RAISE NOTICE 'Done — main_category added, sections seeded';
END;
$$;

-- Verify
SELECT category, main_category, sort_order
FROM menu
WHERE business_id = (SELECT id FROM businesses WHERE slug = 'lapiazzetta')
ORDER BY main_category, sort_order;
