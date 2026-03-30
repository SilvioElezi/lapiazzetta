/**
 * BarPRO Oracle XE → Supabase Migration Script
 *
 * Runs locally (needs Oracle XE installed on this machine).
 * Reads articles, employees, customers from Oracle → inserts into Supabase.
 *
 * Usage:
 *   node migrate.js --dry-run    (preview only, no writes)
 *   node migrate.js              (full migration)
 *   node migrate.js --only=articles
 *   node migrate.js --only=staff
 *   node migrate.js --only=customers
 *   node migrate.js --only=vat
 */

const oracledb   = require('oracledb');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.migrate' });

// Thick mode required for Oracle XE 10.2 (too old for Thin mode)
// Needs 64-bit Oracle Instant Client 11.2 extracted to ORACLE_CLIENT_DIR
oracledb.initOracleClient({
  libDir: process.env.ORACLE_CLIENT_DIR || 'C:\\instantclient_11_2_64',
});

// ── Config ────────────────────────────────────────────────────────────────────

const ORACLE = {
  user:         'bar',
  password:     'bar',
  connectString:'127.0.0.1:1521/XE',
};

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUSINESS_SLUG        = process.env.BUSINESS_SLUG;

const isDryRun  = process.argv.includes('--dry-run');
const onlyTable = (process.argv.find(a => a.startsWith('--only=')) || '').replace('--only=', '') || null;

// ── Italian Market: Currency conversion ──────────────────────────────────────
// Prices in Oracle are in Albanian Lekë (ALL). Convert to EUR.
const ALL_TO_EUR = 108; // 1 EUR ≈ 108 ALL

function toEur(allPrice) {
  if (!allPrice || Number(allPrice) === 0) return 0;
  const eur = Number(allPrice) / ALL_TO_EUR;
  return Math.round(eur * 20) / 20; // round to nearest €0.05
}

// ── Italian Market: VAT rates ─────────────────────────────────────────────────
// Italy: 4% (ridotta), 10% (standard food/drink), 22% (alcolici)
const ITALIAN_VAT_RATES = [
  { code: 'a', rate: 4,  name: 'IVA ridotta 4%',    is_default: false },
  { code: 'b', rate: 10, name: 'IVA standard 10%',   is_default: true  },
  { code: 'c', rate: 22, name: 'IVA alcolici 22%',   is_default: false },
];

// Keywords that indicate an alcoholic product → 22% IVA
const ALCOHOL_KEYWORDS = [
  'vodka', 'gin', 'whisky', 'whiskey', 'rum', 'tequila', 'birra', 'vino',
  'beer', 'wine', 'amaro', 'amaretto', 'fernet', 'campari', 'aperol',
  'sambuca', 'cognac', 'grappa', 'brandy', 'metaxa', 'baileys', 'kahlúa',
  'malibu', 'cointreau', 'triple sec', 'curaçao', 'jäger', 'bacardi',
  'captain morgan', 'havana', 'absolut', 'smirnoff', 'grey goose',
  'belvedere', 'finlandia', 'puschkin', 'gorbatschow', 'artic',
  'gordon', 'bombay', 'tanqueray', 'beefeater', 'johnnie', 'jack daniel',
  'chivas', 'ballantine', 'j&b', 'cutty', 'laphroaig', 'lagavulin',
  'glenfiddich', 'jameson', 'cardhu', 'dimple', 'vecchia romagna',
  'ouzo', 'kriko', 'pampero', 'cachaça', 'batida', 'rosato',
  'mojito', 'caipirinha', 'caipirosca', 'piña colada', 'margarita',
  'daiquiri', 'cosmopolitan', 'metropolitan', 'long island', 'negroni',
  'kamikaze', 'b-52', 'ferrari', 'lamborghini', 'amf', 'black russian',
  'disaronno', 'lucano', 'ramazzotti', 'averna', 'montenegro', 'unicum',
  'martini', 'grand marnier', 'southern comfort', 'camus', 'courvoisier',
  'peroni', 'ursus', 'corona', 'heineken', 'tuborg', 'paulaner',
  'alla spina', 'shot', 'red bull vodka', 'sex on the beach',
  'sheridans', 'glen', 'caipi', 'mai tai',
];

function detectVatCode(italianName) {
  const lower = italianName.toLowerCase();
  for (const kw of ALCOHOL_KEYWORDS) {
    if (lower.includes(kw)) return 'c'; // 22% alcolici
  }
  return 'b'; // 10% default
}

// ── Italian Market: Article name translations (Albanian → Italian) ────────────
const ARTICLE_NAMES = {
  // Caffetteria
  'Kafe':                   'Caffè',
  'Makiato':                'Macchiato',
  'Qumesht LP':             'Latte (interno)',
  'Kapucino Kafe':          'Cappuccino',
  'Caj i ngrohte':          'Tè caldo',
  'Cokollate LP':           'Cioccolata (interna)',
  'Makiato e gjate':        'Macchiato lungo',
  'Salep LP':               'Salep (interno)',
  'Kakao LP':               'Cacao (interno)',
  'Neskafe Ngrohte':        'Nescafè caldo',
  'Kapucino bustine LP':    'Cappuccino bustina (interno)',
  'Neskafe Kanace':         'Nescafè in lattina',
  'Salep':                  'Salep',
  'Cokollate':              'Cioccolata calda',
  'Kakao':                  'Cacao',
  'Kapucino bustine':       'Cappuccino in busta',
  'Caj me Qumesht':         'Tè con latte',
  'Kafe Fredo':             'Caffè freddo',
  'Kafe Latte':             'Caffè Latte',
  'Makiato Fredo':          'Macchiato freddo',
  'Makiato Qum. Ftohte':    'Macchiato latte freddo',
  'Koreto':                 'Caffè corretto',
  'Frape':                  'Frappé',
  'Fredoccino':             'Fredoccino',
  'Cokollate e Ftohte':     'Cioccolata fredda',
  // Analcolici
  'Coca Cola':              'Coca Cola',
  'Fanta':                  'Fanta',
  'Lipton Ice Tea':         'Lipton Ice Tea',
  'Portokall i shtrydhur':  "Succo d'arancia fresco",
  'Lemon Soda':             'Lemon Soda',
  'Bravo':                  'Bravo',
  'Sprite':                 'Sprite',
  'Crodino':                'Crodino',
  'Bitter':                 'Bitter analcolico',
  'Britvic':                'Britvic',
  'Red Bull':               'Red Bull',
  'Oran Soda':              'Oran Soda',
  'Water Soda':             'Acqua tonica',
  'Qumesht':                'Latte',
  'Leng Frutash':           'Succo di frutta',
  'Uje':                    'Acqua minerale',
  'Pepsi':                  'Pepsi',
  'Ivi':                    'Ivi',
  'Leng Karrote':           'Succo di carota',
  'Leng Molle':             'Succo di mela',
  'Mix Fresh':              'Mix Fresh',
  // Birre
  'Peroni':                 'Peroni',
  'Ursus':                  'Ursus',
  'Corona':                 'Corona',
  'Heineken':               'Heineken',
  'Tuborg':                 'Tuborg',
  'Paulaner':               'Paulaner',
  'Birre e Hapur':          'Birra alla spina',
  'Paulaner Weiss':         'Paulaner Weiss',
  // Vodka
  'Absolut':                'Absolut',
  'Smirnoff Red':           'Smirnoff Red',
  'Puschkin Black':         'Puschkin Black',
  'Puschkin Red':           'Puschkin Red',
  'Gorbatschow':            'Gorbatschow',
  'Artic':                  'Artic',
  'Grey Goose':             'Grey Goose',
  'Belvedere':              'Belvedere',
  'Finlandia':              'Finlandia',
  // Gin
  'Gin Gordons':            "Gordon's Gin",
  'Bombay':                 'Bombay Sapphire',
  'Tanqueray':              'Tanqueray',
  'Beefeater':              'Beefeater',
  // Whisky
  'Johnnie Red':            'Johnnie Walker Red',
  'Johnnie Black':          'Johnnie Walker Black',
  'Jack Daniels':           "Jack Daniel's",
  'Chivas Regal':           'Chivas Regal',
  'Ballantines':            "Ballantine's",
  'J&&B':                   'J&B',
  'Cutty Sark':             'Cutty Sark',
  'Laprohaig':              'Laphroaig',
  'Lagavulin':              'Lagavulin',
  'Glen Grant':             'Glen Grant',
  'Cardhu':                 'Cardhu',
  'Dimple':                 'Dimple',
  'Johnnie Blue':           'Johnnie Walker Blue',
  'Glenfiddich':            'Glenfiddich',
  'Jameson':                'Jameson',
  // Rum
  'Bacardi White':          'Bacardi Bianco',
  'Bacardi Black':          'Bacardi Nero',
  'Captain Morgan':         'Captain Morgan',
  'Havana 7':               'Havana Club 7',
  'Havana Club':            'Havana Club',
  'Pampero Aniv.':          'Pampero Anniversario',
  'Pampero':                'Pampero',
  // Distillati vari
  'Tequila':                'Tequila',
  'Malibu':                 'Malibu',
  'Cointreau':              'Cointreau',
  'Sambuca':                'Sambuca',
  'Triple Sec':             'Triple Sec',
  'Blue Guracao':           'Blue Curaçao',
  'Cachaca':                'Cachaça',
  'Batida de Coco':         'Batida de Coco',
  'Ouzo 12':                'Ouzo 12',
  'Kriko M.':               'Kriko M.',
  'Kriko V.':               'Kriko V.',
  'Raki Rrushi':            "Grappa d'uva",
  'Konjak Skenderbeu':      'Cognac Skënderbeu',
  // Amari e liquori
  'A. Lucano':              'Amaro Lucano',
  'Unicum':                 'Unicum',
  'A. Disaronno':           'Amaretto Disaronno',
  'Fernet Branca':          'Fernet Branca',
  'A. Ramazzotti':          'Amaro Ramazzotti',
  'A. Averna':              'Amaro Averna',
  'A. Montenegro':          'Amaro Montenegro',
  'Jagermeister':           'Jägermeister',
  'Baileys':                'Baileys',
  'Kahlua':                 'Kahlúa',
  'Sheridans':              'Sheridans',
  'Campari':                'Campari',
  'Aperol':                 'Aperol',
  'Grand Marnier':          'Grand Marnier',
  'Disaronno Portokall':    'Disaronno Arancia',
  'Southern Comfort':       'Southern Comfort',
  'Camus VSOP':             'Camus VSOP',
  'Courvoisier VSOP':       'Courvoisier VSOP',
  // Brandy / Cognac
  'Vecchia Romagna':        'Vecchia Romagna',
  'Metaxa 5':               'Metaxa 5 stelle',
  'Metaxa 7':               'Metaxa 7 stelle',
  // Vino e vermouth
  'Martini Rosso':          'Martini Rosso',
  'Martini Bianco':         'Martini Bianco',
  'Vere Kuqe':              'Vino rosso',
  'Vere Bardhe':            'Vino bianco',
  'Kuqalashe':              'Rosato',
  // Cocktail
  'Vodka Redbull':          'Vodka Red Bull',
  'Vodka Lemon':            'Vodka Lemon',
  'Vodka Tonik':            'Vodka Tonic',
  'Vodka Portokall':        'Vodka Arancia',
  'Gin Tonik':              'Gin Tonic',
  'Gin Lemon':              'Gin Lemon',
  'Bacardi Cola':           'Bacardi Cola',
  'Jager Redbull':          'Jäger Red Bull',
  'Ferrari':                'Ferrari',
  'Lamborghini':            'Lamborghini',
  'Jager Cola':             'Jäger Cola',
  'Jack Redbull':           "Jack Daniel's Red Bull",
  'Jack Cola':              "Jack Daniel's Cola",
  'Johnnie Cola':           'Johnnie Walker Cola',
  'Mojito':                 'Mojito',
  'Caipirinha':             'Caipirinha',
  'Caipirosca':             'Caipirosca',
  'Caipinera':              'Caipi Nera',
  'Pina Colada':            'Piña Colada',
  'Margherita':             'Margarita',
  'Daiquiri':               'Daiquiri',
  'Sex on the beach':       'Sex on the Beach',
  'Metropolitan':           'Metropolitan',
  'Cosmopolitan':           'Cosmopolitan',
  'Vodka Sour':             'Vodka Sour',
  'Long Island':            'Long Island Ice Tea',
  'AMF':                    'AMF',
  'Shots tequila':          'Shot Tequila',
  'B-52':                   'B-52',
  'Martini Vodka':          'Vodka Martini',
  'Johnnie Red Bull':       'Johnnie Walker Red Bull',
  'Malibu Portokall':       'Malibu Arancia',
  'Malibu Cola':            'Malibu Cola',
  'Malibu Ananas':          'Malibu Ananas',
  'Ursus Red Bull':         'Ursus Red Bull',
  'Johnnie Black Cola':     'Johnnie Walker Black Cola',
  'Black Russian':          'Black Russian',
  'Kamikaz':                'Kamikaze',
  'Disaronno Sour':         'Disaronno Sour',
  'Chivas Cola':            'Chivas Cola',
  'Chivas Red Bull':        'Chivas Red Bull',
  'Mai Tai':                'Mai Tai',
  'Negroni':                'Negroni',
  'J&&B Cola':              'J&B Cola',
  'Jager Shots':            'Shot Jägermeister',
  'Vodka Shots':            'Shot Vodka',
  'Jack shots':             "Shot Jack Daniel's",
  // Gelato
  'Akullore LP':            'Gelato (interno)',
  'Akullore V.':            'Gelato piccolo',
  'Akullore Mes.':          'Gelato medio',
  'Akullore M.':            'Gelato grande',
  // Cibo
  'Tost':                   'Toast',
  'Briosh':                 'Brioche',
  'Sandwich':               'Sandwich',
  // Altro
  'Monini':                 'Monini',
};

function translateName(albanianName) {
  const trimmed = albanianName.trim();
  return ARTICLE_NAMES[trimmed] || trimmed; // fallback: keep original
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg)  { console.log(`  ✓ ${msg}`); }
function warn(msg) { console.warn(`  ⚠ ${msg}`); }
function err(msg)  { console.error(`  ✗ ${msg}`); }

function shouldRun(name) {
  return !onlyTable || onlyTable === name;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  BarPRO → Supabase Migration (Italian market)');
  console.log(`  Mode: ${isDryRun ? 'DRY RUN (no writes)' : 'LIVE'}`);
  if (onlyTable) console.log(`  Only: ${onlyTable}`);
  console.log('══════════════════════════════════════════════\n');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !BUSINESS_SLUG) {
    err('Missing env vars. Create scripts/migrate/.env.migrate with:');
    err('  SUPABASE_URL=https://xxxx.supabase.co');
    err('  SUPABASE_SERVICE_KEY=eyJ...');
    err('  BUSINESS_SLUG=lapiazzetta');
    process.exit(1);
  }

  // Connect Oracle
  console.log('Connecting to Oracle XE...');
  let oraConn;
  try {
    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
    oraConn = await oracledb.getConnection(ORACLE);
    log('Oracle connected');
  } catch (e) {
    err(`Oracle connection failed: ${e.message}`);
    process.exit(1);
  }

  // Connect Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Resolve business_id from slug
  console.log(`\nResolving business: ${BUSINESS_SLUG}`);
  const { data: business, error: bizErr } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('slug', BUSINESS_SLUG)
    .single();

  if (bizErr || !business) {
    err(`Business '${BUSINESS_SLUG}' not found in Supabase: ${bizErr?.message}`);
    await oraConn.close();
    process.exit(1);
  }
  log(`Business found: "${business.name}" (${business.id})`);

  const businessId = business.id;

  // ── 1. VAT Rates (Italian) ────────────────────────────────────────────────
  if (shouldRun('vat')) {
    console.log('\n── VAT Rates (Italian market) ──');

    for (const record of ITALIAN_VAT_RATES) {
      console.log(`    ${record.code}  ${record.rate}%  ${record.name}`);

      if (!isDryRun) {
        const { error } = await supabase
          .from('vat_rates')
          .upsert({ business_id: businessId, ...record }, { onConflict: 'business_id,code' });
        if (error) warn(`VAT upsert error: ${error.message}`);
      }
    }
    log('VAT rates done');
  }

  // ── 2. Articles ───────────────────────────────────────────────────────────
  if (shouldRun('articles')) {
    console.log('\n── Articles ──');

    // Fetch VAT rate map (code → id in Supabase)
    const { data: vatRates } = await supabase
      .from('vat_rates')
      .select('id, code')
      .eq('business_id', businessId);
    const vatMap = Object.fromEntries((vatRates || []).map(v => [v.code, v.id]));

    const result = await oraConn.execute(
      `SELECT article_code, tag, sell_price, taksa_id, qty_on_hand,
              inv_printer, porosi_id
       FROM article
       ORDER BY article_code`
    );
    log(`Found ${result.rows.length} articles in Oracle`);

    let inserted = 0;
    let skipped  = 0;
    let untranslated = [];

    for (const row of result.rows) {
      if (!row.TAG) { skipped++; continue; }

      const albName    = String(row.TAG).trim();
      const itName     = translateName(albName);
      const priceEur   = toEur(row.SELL_PRICE);
      const vatCode    = detectVatCode(itName);
      const vatRateId  = vatMap[vatCode] || null;

      if (itName === albName && !ARTICLE_NAMES[albName]) {
        untranslated.push(albName); // track untranslated names
      }

      const record = {
        business_id:      businessId,
        code:             String(row.ARTICLE_CODE),
        name:             itName,
        price:            priceEur,
        vat_rate_id:      vatRateId,
        category:         row.POROSI_ID ? String(row.POROSI_ID) : null,
        quantity_on_hand: Number(row.QTY_ON_HAND) || 0,
        printer_id:       row.INV_PRINTER ? String(row.INV_PRINTER) : null,
        active:           true,
      };

      if (isDryRun) {
        const vatLabel = vatCode === 'c' ? '22%' : vatCode === 'a' ? '4%' : '10%';
        console.log(`    [${record.code}] ${record.name}  €${record.price.toFixed(2)}  IVA ${vatLabel}`);
      } else {
        const { error } = await supabase
          .from('articles')
          .upsert(record, { onConflict: 'business_id,code' });
        if (error) warn(`Article ${record.code} error: ${error.message}`);
        else inserted++;
      }
    }

    if (!isDryRun) log(`Articles: ${inserted} inserted, ${skipped} skipped (blank)`);
    else          log(`Dry run: ${result.rows.length - skipped} articles would be inserted`);

    if (untranslated.length > 0) {
      warn(`${untranslated.length} articles kept original name (no translation found):`);
      untranslated.forEach(n => warn(`  → "${n}"`));
    }
  }

  // ── 3. Staff / Employees ──────────────────────────────────────────────────
  if (shouldRun('staff')) {
    console.log('\n── Staff / Employees ──');
    const result = await oraConn.execute(
      `SELECT employee_id, code, status_2 FROM employee ORDER BY employee_id`
    );
    log(`Found ${result.rows.length} employees in Oracle`);

    for (const row of result.rows) {
      const isAdmin = row.EMPLOYEE_ID === 0 || row.EMPLOYEE_ID === '0';
      const record  = {
        business_id:    businessId,
        username:       `emp_${row.EMPLOYEE_ID}`,
        name:           `Employee ${row.EMPLOYEE_ID}`,
        role:           isAdmin ? 'admin' : 'reception',
        password:       String(row.CODE || ''),
        pin:            String(row.CODE || ''),
        employee_code:  String(row.EMPLOYEE_ID),
        active:         row.STATUS_2 !== '0',
      };

      console.log(`    [${record.employee_code}] ${record.username}  role:${record.role}`);

      if (!isDryRun) {
        const { data: existing } = await supabase
          .from('staff')
          .select('id')
          .eq('business_id', businessId)
          .eq('employee_code', record.employee_code)
          .maybeSingle();

        if (!existing) {
          const { error } = await supabase.from('staff').insert(record);
          if (error) warn(`Staff ${record.employee_code} error: ${error.message}`);
        } else {
          log(`Staff ${record.employee_code} already exists, skipping`);
        }
      }
    }
    log('Staff done');
  }

  // ── 4. Customers ──────────────────────────────────────────────────────────
  if (shouldRun('customers')) {
    console.log('\n── Customers (klient) ──');
    const result = await oraConn.execute(
      `SELECT klient_id, em_mb, skonto, status
       FROM klient
       ORDER BY klient_id`
    );
    log(`Found ${result.rows.length} customers in Oracle`);

    let inserted = 0;
    for (const row of result.rows) {
      if (!row.EM_MB) continue;

      const record = {
        business_id:   businessId,
        name:          String(row.EM_MB).trim(),
        discount_pct:  Number(row.SKONTO) || 0,
        active:        row.STATUS !== '0',
      };

      console.log(`    ${record.name}  sconto:${record.discount_pct}%`);

      if (!isDryRun) {
        const { error } = await supabase.from('customers').insert(record);
        if (error) warn(`Customer ${record.name} error: ${error.message}`);
        else inserted++;
      }
    }

    if (!isDryRun) log(`Customers: ${inserted} inserted`);
    else          log(`Dry run complete`);
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  await oraConn.close();

  console.log('\n══════════════════════════════════════════════');
  console.log(isDryRun ? '  DRY RUN complete — no data was written.' : '  Migration complete!');
  console.log('══════════════════════════════════════════════\n');

  if (!isDryRun) {
    console.log('Next steps:');
    console.log('  1. Verify data in Supabase dashboard');
    console.log('  2. Review articles with 22% IVA (alcolici) — adjust if needed');
    console.log('  3. Rename staff accounts (emp_0, emp_1 → real names)');
    console.log('  4. Set secure PINs for all staff\n');
  }
}

main().catch(e => {
  err(e.message);
  process.exit(1);
});
