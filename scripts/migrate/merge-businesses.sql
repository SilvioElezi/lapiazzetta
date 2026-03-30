-- Merge pizzeria-chiari → lapiazzetta
-- Run in Supabase SQL Editor

DO $$
DECLARE
  lp_id uuid;  -- lapiazzetta business id
  pc_id uuid;  -- pizzeria-chiari business id
BEGIN
  SELECT id INTO lp_id FROM businesses WHERE slug = 'lapiazzetta';
  SELECT id INTO pc_id FROM businesses WHERE slug = 'pizzeria-chiari';

  IF lp_id IS NULL THEN RAISE EXCEPTION 'lapiazzetta not found'; END IF;
  IF pc_id IS NULL THEN RAISE EXCEPTION 'pizzeria-chiari not found'; END IF;

  RAISE NOTICE 'lapiazzetta  id: %', lp_id;
  RAISE NOTICE 'pizzeria-chiari id: %', pc_id;

  -- ── 1. STAFF ─────────────────────────────────────────────────────────────────
  -- Move staff that don't have a username clash in lapiazzetta
  UPDATE staff
  SET business_id = lp_id
  WHERE business_id = pc_id
    AND username NOT IN (
      SELECT username FROM staff WHERE business_id = lp_id
    );

  -- Rename and move any remaining clashing staff (append _pc suffix)
  UPDATE staff
  SET business_id = lp_id,
      username    = username || '_pc'
  WHERE business_id = pc_id;

  RAISE NOTICE 'Staff migrated';

  -- ── 2. TABLES ────────────────────────────────────────────────────────────────
  UPDATE tables SET business_id = lp_id WHERE business_id = pc_id;
  RAISE NOTICE 'Tables migrated';

  -- ── 3. INVOICES ──────────────────────────────────────────────────────────────
  UPDATE invoices SET business_id = lp_id WHERE business_id = pc_id;
  RAISE NOTICE 'Invoices migrated';

  -- ── 4. MENU CATEGORIES ───────────────────────────────────────────────────────
  -- Move menu categories that don't already exist in lapiazzetta
  UPDATE menu
  SET business_id = lp_id
  WHERE business_id = pc_id
    AND category NOT IN (
      SELECT category FROM menu WHERE business_id = lp_id
    );

  -- Delete duplicate menu categories (already exist in lapiazzetta)
  DELETE FROM menu WHERE business_id = pc_id;
  RAISE NOTICE 'Menu categories migrated';

  -- ── 5. VAT RATES ─────────────────────────────────────────────────────────────
  -- Delete pc vat rates (lapiazzetta already has Italian rates)
  DELETE FROM vat_rates WHERE business_id = pc_id;
  RAISE NOTICE 'VAT rates cleaned';

  -- ── 6. DELETE pizzeria-chiari ─────────────────────────────────────────────────
  DELETE FROM businesses WHERE id = pc_id;
  RAISE NOTICE 'pizzeria-chiari deleted';

END;
$$;

-- Verify result
SELECT
  (SELECT COUNT(*) FROM staff     WHERE business_id = (SELECT id FROM businesses WHERE slug='lapiazzetta')) as staff,
  (SELECT COUNT(*) FROM tables    WHERE business_id = (SELECT id FROM businesses WHERE slug='lapiazzetta')) as tables,
  (SELECT COUNT(*) FROM invoices  WHERE business_id = (SELECT id FROM businesses WHERE slug='lapiazzetta')) as invoices,
  (SELECT COUNT(*) FROM menu      WHERE business_id = (SELECT id FROM businesses WHERE slug='lapiazzetta')) as menu_cats,
  (SELECT COUNT(*) FROM articles  WHERE business_id = (SELECT id FROM businesses WHERE slug='lapiazzetta')) as articles;
