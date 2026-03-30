-- Categorize articles by Italian name → BarPRO category ID
-- Run this in the Supabase SQL Editor
-- Categories: 1=Caffetteria, 2=Bibite, 3=Birra, 4=Gin/Tequila,
--             5=Whisky, 6=Vodka, 7=Amaro, 8=Vino, 9=Liquori,
--             10=Cognac, 11=Rum, 12=Long Drinks, 13=Cocktail, 14=Shots, 0=Varie

DO $$
DECLARE
  bid uuid;
BEGIN
  SELECT id INTO bid FROM businesses WHERE slug = 'lapiazzetta';
  IF bid IS NULL THEN RAISE EXCEPTION 'Business not found'; END IF;

  -- 1 Caffetteria
  UPDATE articles SET category = '1' WHERE business_id = bid AND name IN (
    'Caffè','Macchiato','Latte (interno)','Cappuccino','Tè caldo',
    'Cioccolata (interna)','Macchiato lungo','Salep (interno)','Cacao (interno)',
    'Nescafè caldo','Cappuccino bustina (interno)','Nescafè in lattina',
    'Salep','Cioccolata calda','Cacao','Cappuccino in busta','Tè con latte',
    'Caffè freddo','Caffè Latte','Macchiato freddo','Macchiato latte freddo',
    'Caffè corretto','Frappé','Fredoccino','Cioccolata fredda'
  );
  RAISE NOTICE 'Cat 1 (Caffetteria): % rows', ROW_COUNT();

  -- 2 Bibite (analcoliche)
  UPDATE articles SET category = '2' WHERE business_id = bid AND name IN (
    'Coca Cola','Fanta','Lipton Ice Tea','Succo d''arancia fresco','Lemon Soda',
    'Bravo','Sprite','Crodino','Bitter analcolico','Britvic','Red Bull',
    'Oran Soda','Acqua tonica','Latte','Succo di frutta','Acqua minerale',
    'Pepsi','Ivi','Succo di carota','Succo di mela','Mix Fresh'
  );
  RAISE NOTICE 'Cat 2 (Bibite): % rows', ROW_COUNT();

  -- 3 Birra
  UPDATE articles SET category = '3' WHERE business_id = bid AND name IN (
    'Peroni','Ursus','Corona','Heineken','Tuborg','Paulaner',
    'Birra alla spina','Paulaner Weiss'
  );
  RAISE NOTICE 'Cat 3 (Birra): % rows', ROW_COUNT();

  -- 4 Gin / Tequila
  UPDATE articles SET category = '4' WHERE business_id = bid AND name IN (
    'Gordon''s Gin','Bombay Sapphire','Tanqueray','Beefeater','Tequila'
  );
  RAISE NOTICE 'Cat 4 (Gin/Tequila): % rows', ROW_COUNT();

  -- 5 Whisky
  UPDATE articles SET category = '5' WHERE business_id = bid AND name IN (
    'Johnnie Walker Red','Johnnie Walker Black','Jack Daniel''s','Chivas Regal',
    'Ballantine''s','J&B','Cutty Sark','Laphroaig','Lagavulin','Glen Grant',
    'Cardhu','Dimple','Johnnie Walker Blue','Glenfiddich','Jameson'
  );
  RAISE NOTICE 'Cat 5 (Whisky): % rows', ROW_COUNT();

  -- 6 Vodka
  UPDATE articles SET category = '6' WHERE business_id = bid AND name IN (
    'Absolut','Smirnoff Red','Puschkin Black','Puschkin Red','Gorbatschow',
    'Artic','Grey Goose','Belvedere','Finlandia'
  );
  RAISE NOTICE 'Cat 6 (Vodka): % rows', ROW_COUNT();

  -- 7 Amaro
  UPDATE articles SET category = '7' WHERE business_id = bid AND name IN (
    'Amaro Lucano','Unicum','Amaretto Disaronno','Fernet Branca',
    'Amaro Ramazzotti','Amaro Averna','Amaro Montenegro','Jägermeister',
    'Baileys','Kahlúa','Sheridans','Campari','Aperol','Grand Marnier',
    'Disaronno Arancia','Southern Comfort'
  );
  RAISE NOTICE 'Cat 7 (Amaro): % rows', ROW_COUNT();

  -- 8 Vino
  UPDATE articles SET category = '8' WHERE business_id = bid AND name IN (
    'Martini Rosso','Martini Bianco','Vino rosso','Vino bianco','Rosato'
  );
  RAISE NOTICE 'Cat 8 (Vino): % rows', ROW_COUNT();

  -- 9 Liquori
  UPDATE articles SET category = '9' WHERE business_id = bid AND name IN (
    'Malibu','Cointreau','Sambuca','Triple Sec','Blue Curaçao',
    'Cachaça','Batida de Coco','Ouzo 12','Kriko M.','Kriko V.'
  );
  RAISE NOTICE 'Cat 9 (Liquori): % rows', ROW_COUNT();

  -- 10 Cognac
  UPDATE articles SET category = '10' WHERE business_id = bid AND name IN (
    'Camus VSOP','Courvoisier VSOP','Vecchia Romagna',
    'Metaxa 5 stelle','Metaxa 7 stelle','Cognac Skënderbeu'
  );
  RAISE NOTICE 'Cat 10 (Cognac): % rows', ROW_COUNT();

  -- 11 Rum
  UPDATE articles SET category = '11' WHERE business_id = bid AND name IN (
    'Bacardi Bianco','Bacardi Nero','Captain Morgan','Havana Club 7',
    'Havana Club','Pampero Anniversario','Pampero','Grappa d''uva'
  );
  RAISE NOTICE 'Cat 11 (Rum): % rows', ROW_COUNT();

  -- 12 Long Drinks
  UPDATE articles SET category = '12' WHERE business_id = bid AND name IN (
    'Vodka Red Bull','Vodka Lemon','Vodka Tonic','Vodka Arancia',
    'Gin Tonic','Gin Lemon','Bacardi Cola','Jäger Red Bull','Jäger Cola',
    'Jack Daniel''s Red Bull','Jack Daniel''s Cola','Johnnie Walker Cola',
    'Long Island Ice Tea','AMF','Vodka Martini','Johnnie Walker Red Bull',
    'Malibu Arancia','Malibu Cola','Malibu Ananas','Ursus Red Bull',
    'Johnnie Walker Black Cola','Black Russian','Kamikaze','Disaronno Sour',
    'Chivas Cola','Chivas Red Bull','J&B Cola','Ferrari','Lamborghini'
  );
  RAISE NOTICE 'Cat 12 (Long Drinks): % rows', ROW_COUNT();

  -- 13 Cocktail
  UPDATE articles SET category = '13' WHERE business_id = bid AND name IN (
    'Mojito','Caipirinha','Caipirosca','Caipi Nera','Piña Colada',
    'Margarita','Daiquiri','Sex on the Beach','Metropolitan',
    'Cosmopolitan','Vodka Sour','Mai Tai','Negroni'
  );
  RAISE NOTICE 'Cat 13 (Cocktail): % rows', ROW_COUNT();

  -- 14 Shots
  UPDATE articles SET category = '14' WHERE business_id = bid AND name IN (
    'Shot Tequila','B-52','Shot Jägermeister','Shot Vodka','Shot Jack Daniel''s'
  );
  RAISE NOTICE 'Cat 14 (Shots): % rows', ROW_COUNT();

  -- 0 Varie (gelato, cibo, altro)
  UPDATE articles SET category = '0' WHERE business_id = bid AND name IN (
    'Gelato (interno)','Gelato piccolo','Gelato medio','Gelato grande',
    'Toast','Brioche','Sandwich','Monini'
  );
  RAISE NOTICE 'Cat 0 (Varie): % rows', ROW_COUNT();

END;
$$;

-- Check result — should show rows spread across multiple categories
SELECT
  a.category,
  COUNT(*) as count
FROM articles a
JOIN businesses b ON b.id = a.business_id
WHERE b.slug = 'lapiazzetta'
GROUP BY a.category
ORDER BY a.category::integer NULLS LAST;
