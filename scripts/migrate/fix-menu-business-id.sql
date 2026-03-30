-- Fix menu rows that were seeded without business_id
-- Run in Supabase SQL Editor

UPDATE menu
SET business_id = (SELECT id FROM businesses WHERE slug = 'lapiazzetta')
WHERE business_id IS NULL;

-- Verify
SELECT business_id, COUNT(*) as categories FROM menu GROUP BY business_id;
