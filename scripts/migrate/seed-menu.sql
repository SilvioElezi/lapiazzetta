-- Seed pizza/food menu into the menu table
-- Run in Supabase SQL Editor

DO $$
DECLARE
  bid uuid;
BEGIN
  SELECT id INTO bid FROM businesses WHERE slug = 'lapiazzetta';
  IF bid IS NULL THEN RAISE EXCEPTION 'Business not found'; END IF;

  -- Clear existing menu for this business
  DELETE FROM menu WHERE business_id = bid;

  -- 0: Pizze Classiche
  INSERT INTO menu (business_id, category, emoji, sort_order, items) VALUES (bid, 'Pizze Classiche', '🍕', 0, '[
    {"id":"margherita",      "name":"Margherita",        "ingredients":"Salsa di pomodoro artigianale, fior di latte, basilico fresco",                          "price":7.50,  "popular":true,  "vegetarian":true},
    {"id":"marinara",        "name":"Marinara",           "ingredients":"Salsa di pomodoro, aglio, origano, olio EVO",                                            "price":6.50,  "vegetarian":true},
    {"id":"napoli",          "name":"Napoli",             "ingredients":"Salsa di pomodoro, mozzarella, acciughe, capperi, origano",                              "price":9.00},
    {"id":"romana",          "name":"Romana",             "ingredients":"Salsa di pomodoro, mozzarella, acciughe, origano",                                       "price":8.50},
    {"id":"quattro-stagioni","name":"Quattro Stagioni",   "ingredients":"Salsa di pomodoro, mozzarella, carciofi, prosciutto cotto, funghi, olive nere",          "price":10.50, "popular":true},
    {"id":"capricciosa",     "name":"Capricciosa",        "ingredients":"Salsa di pomodoro, mozzarella, prosciutto cotto, funghi, carciofi, olive",               "price":10.00}
  ]'::jsonb);

  -- 1: Pizze Speciali
  INSERT INTO menu (business_id, category, emoji, sort_order, items) VALUES (bid, 'Pizze Speciali', '⭐', 1, '[
    {"id":"diavola",   "name":"Diavola",          "ingredients":"Salsa di pomodoro, mozzarella, salame piccante, peperoncino",                                    "price":9.50,  "spicy":true, "popular":true},
    {"id":"boscaiola", "name":"Boscaiola",         "ingredients":"Mozzarella, funghi porcini, salsiccia, besciamella, prezzemolo",                                "price":11.50, "popular":true},
    {"id":"parmigiana","name":"Parmigiana",         "ingredients":"Salsa di pomodoro, mozzarella, melanzane grigliate, parmigiano, basilico",                     "price":10.50, "vegetarian":true},
    {"id":"norma",     "name":"Norma",              "ingredients":"Salsa di pomodoro, ricotta salata, melanzane fritte, basilico",                                "price":10.00, "vegetarian":true},
    {"id":"nduja",     "name":"Nduja e Burrata",    "ingredients":"Salsa di pomodoro, burrata fresca, nduja calabrese, basilico",                                 "price":13.00, "spicy":true, "popular":true},
    {"id":"tartufo",   "name":"Al Tartufo",         "ingredients":"Mozzarella, crema di tartufo nero, funghi champignon, scaglie di parmigiano",                  "price":14.00, "description":"La nostra pizza più pregiata"},
    {"id":"piazzetta", "name":"La Piazzetta",       "ingredients":"Mozzarella, prosciutto crudo DOP, rucola, pomodorini, scaglie di grana",                       "price":13.50, "popular":true, "description":"La nostra pizza firma"}
  ]'::jsonb);

  -- 2: Pizza Bianca
  INSERT INTO menu (business_id, category, emoji, sort_order, items) VALUES (bid, 'Pizza Bianca', '⬜', 2, '[
    {"id":"bianca-classica",  "name":"Bianca Classica",      "ingredients":"Mozzarella fior di latte, olio EVO, rosmarino, sale",                               "price":7.00,  "vegetarian":true},
    {"id":"patate-rosmarino", "name":"Patate e Rosmarino",   "ingredients":"Mozzarella, patate a fette, rosmarino, olio EVO",                                   "price":9.00,  "vegetarian":true, "popular":true},
    {"id":"speck-brie",       "name":"Speck e Brie",         "ingredients":"Mozzarella, speck Alto Adige, brie, noci, miele di acacia",                         "price":12.50},
    {"id":"gorgonzola-pere",  "name":"Gorgonzola e Pere",    "ingredients":"Mozzarella, gorgonzola DOP, pere caramellate, noci",                                "price":12.00, "vegetarian":true}
  ]'::jsonb);

  -- 3: Antipasti
  INSERT INTO menu (business_id, category, emoji, sort_order, items) VALUES (bid, 'Antipasti', '🫒', 3, '[
    {"id":"bruschetta",      "name":"Bruschetta al Pomodoro","ingredients":"Pane casereccio tostato, pomodori freschi, aglio, basilico, olio EVO",               "price":5.00,  "vegetarian":true, "popular":true},
    {"id":"frittura",        "name":"Frittura Mista",        "ingredients":"Supplì al telefono, olive ascolane, mozzarelline fritte, crema fritta",              "price":10.00, "popular":true},
    {"id":"antipasto-salumi","name":"Tagliere di Salumi",    "ingredients":"Prosciutto crudo, salame, mortadella, soppressata, olive, grissini",                 "price":13.00},
    {"id":"burrata",         "name":"Burrata Pugliese",      "ingredients":"Burrata fresca 250g, pomodorini, basilico, olio EVO, sale di Maldon",               "price":9.50,  "vegetarian":true}
  ]'::jsonb);

  -- 4: Dolci
  INSERT INTO menu (business_id, category, emoji, sort_order, items) VALUES (bid, 'Dolci', '🍮', 4, '[
    {"id":"tiramisu",   "name":"Tiramisù della Casa","ingredients":"Mascarpone, savoiardi, caffè espresso, cacao amaro",                                         "price":5.50, "popular":true, "vegetarian":true},
    {"id":"panna-cotta","name":"Panna Cotta",         "ingredients":"Panna fresca, coulis di frutti di bosco",                                                   "price":5.00, "vegetarian":true},
    {"id":"nutella",    "name":"Pizza Nutella",       "ingredients":"Impasto pizza, Nutella, zucchero a velo",                                                   "price":6.00, "vegetarian":true, "popular":true}
  ]'::jsonb);

  -- 5: Bevande (food-side drinks — water, house wine, local beers)
  INSERT INTO menu (business_id, category, emoji, sort_order, items) VALUES (bid, 'Bevande', '🥤', 5, '[
    {"id":"acqua-naturale",  "name":"Acqua Naturale",         "ingredients":"500ml",       "price":1.50},
    {"id":"acqua-frizzante", "name":"Acqua Frizzante",        "ingredients":"500ml",       "price":1.50},
    {"id":"coca-cola",       "name":"Coca-Cola",              "ingredients":"330ml",       "price":2.50},
    {"id":"birra-nastro",    "name":"Birra Nastro Azzurro",   "ingredients":"Bottiglia 33cl","price":3.00, "popular":true},
    {"id":"birra-moretti",   "name":"Birra Moretti",          "ingredients":"Bottiglia 33cl","price":3.00},
    {"id":"vino-rosso",      "name":"Vino Rosso della Casa",  "ingredients":"Caraffa 500ml","price":7.00},
    {"id":"vino-bianco",     "name":"Vino Bianco della Casa", "ingredients":"Caraffa 500ml","price":7.00}
  ]'::jsonb);

  RAISE NOTICE 'Menu seeded: 6 categories for business %', bid;
END;
$$;

-- Verify
SELECT category, emoji, jsonb_array_length(items) as item_count FROM menu
WHERE business_id = (SELECT id FROM businesses WHERE slug = 'lapiazzetta')
ORDER BY sort_order;
