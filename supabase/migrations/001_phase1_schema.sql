-- ============================================================
-- Phase 1 Migration: BarPRO → La Piazzetta
-- Run this in Supabase SQL Editor (dashboard.supabase.com)
-- ============================================================

-- ------------------------------------------------------------
-- 1. VAT RATES (replaces Oracle TAKSA table)
-- ------------------------------------------------------------
create table if not exists vat_rates (
  id            serial primary key,
  business_id   uuid not null references businesses(id) on delete cascade,
  code          text not null,          -- e.g. 'a', 'b'
  rate          numeric(5,2) not null,  -- e.g. 0, 20
  name          text,                   -- e.g. 'Exempt', 'Standard 20%'
  is_default    boolean default false,
  created_at    timestamptz default now(),
  unique(business_id, code)
);

-- ------------------------------------------------------------
-- 2. ARTICLES (replaces Oracle ARTICLE table)
-- ------------------------------------------------------------
create table if not exists articles (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references businesses(id) on delete cascade,
  code                text not null,           -- original article_code from BarPRO
  name                text not null,           -- tag field from BarPRO
  description         text,
  price               numeric(10,2) not null default 0,
  cost_price          numeric(10,2),
  vat_rate_id         int references vat_rates(id),
  category            text,
  quantity_on_hand    numeric(10,3) default 0,
  superior_article_id uuid references articles(id), -- product hierarchy
  printer_id          text,                    -- kitchen/bar printer routing
  active              boolean default true,
  sort_order          int default 0,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  created_by          text,
  unique(business_id, code)
);

-- ------------------------------------------------------------
-- 3. CUSTOMERS (replaces Oracle KLIENT table)
-- ------------------------------------------------------------
create table if not exists customers (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references businesses(id) on delete cascade,
  name                text not null,
  phone               text,
  email               text,
  address             text,
  address_line2       text,
  tax_id              text,              -- NIPT / VAT registration number
  discount_pct        numeric(5,2) default 0,
  notes               text,
  active              boolean default true,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ------------------------------------------------------------
-- 4. VENUES (replaces Oracle LOKALI table)
-- ------------------------------------------------------------
create table if not exists venues (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name        text not null,
  address     text,
  address_2   text,
  phone       text,
  tax_id      text,             -- NIPT
  is_primary  boolean default false,
  active      boolean default true,
  created_at  timestamptz default now()
);

-- ------------------------------------------------------------
-- 5. INVOICES (replaces Oracle INVOICE table)
-- ------------------------------------------------------------
create table if not exists invoices (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references businesses(id) on delete cascade,
  invoice_number  text,                    -- formatted: INV-20260329-001
  daily_sequence  int,                     -- resets to 1 each day
  invoice_date    date not null default current_date,
  invoice_type    text not null default 'sale',  -- sale | purchase | return
  table_id        uuid references tables(id),
  customer_id     uuid references customers(id),
  employee_id     int references staff(id),
  status          text not null default 'open',  -- open | paid | cancelled
  subtotal        numeric(10,2) default 0,
  vat_amount      numeric(10,2) default 0,
  discount_amount numeric(10,2) default 0,
  total           numeric(10,2) default 0,
  payment_method  text,                    -- cash | card | mixed
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  completed_at    timestamptz,
  created_by      text
);

-- ------------------------------------------------------------
-- 6. INVOICE ITEMS (replaces Oracle INVOICE_ITEMS table)
-- ------------------------------------------------------------
create table if not exists invoice_items (
  id            uuid primary key default gen_random_uuid(),
  invoice_id    uuid not null references invoices(id) on delete cascade,
  article_id    uuid references articles(id),
  article_code  text,           -- keep original code as fallback
  article_name  text not null,  -- snapshot name at time of sale
  quantity      numeric(10,3) not null,
  unit_price    numeric(10,2) not null,
  vat_rate      numeric(5,2) default 0,
  discount_pct  numeric(5,2) default 0,
  total_price   numeric(10,2) not null,
  notes         text,
  line_order    int default 0
);

-- ------------------------------------------------------------
-- 7. DAILY SETTLEMENTS (replaces Oracle INVOICE_DATE logic)
-- ------------------------------------------------------------
create table if not exists daily_settlements (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references businesses(id) on delete cascade,
  settlement_date date not null,
  invoice_count   int default 0,
  total_sales     numeric(10,2) default 0,
  total_vat       numeric(10,2) default 0,
  cash_total      numeric(10,2) default 0,
  card_total      numeric(10,2) default 0,
  status          text default 'open',   -- open | closed
  closed_by       text,
  closed_at       timestamptz,
  unique(business_id, settlement_date)
);

-- ------------------------------------------------------------
-- 8. ALTER EXISTING TABLES
-- ------------------------------------------------------------

-- Add venue_id to tables (link physical tables to venue)
alter table tables
  add column if not exists venue_id uuid references venues(id),
  add column if not exists capacity  int,
  add column if not exists table_number int;

-- Add extra fields to staff
alter table staff
  add column if not exists pin         text,
  add column if not exists active      boolean default true,
  add column if not exists created_at  timestamptz default now(),
  add column if not exists employee_code text;

-- ------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) — match existing pattern
-- ------------------------------------------------------------
alter table vat_rates         enable row level security;
alter table articles          enable row level security;
alter table customers         enable row level security;
alter table venues            enable row level security;
alter table invoices          enable row level security;
alter table invoice_items     enable row level security;
alter table daily_settlements enable row level security;

-- Allow service role full access (used by API routes)
create policy "Service role full access" on vat_rates
  for all using (true);
create policy "Service role full access" on articles
  for all using (true);
create policy "Service role full access" on customers
  for all using (true);
create policy "Service role full access" on venues
  for all using (true);
create policy "Service role full access" on invoices
  for all using (true);
create policy "Service role full access" on invoice_items
  for all using (true);
create policy "Service role full access" on daily_settlements
  for all using (true);

-- ------------------------------------------------------------
-- 10. INDEXES for performance
-- ------------------------------------------------------------
create index if not exists idx_articles_business    on articles(business_id);
create index if not exists idx_articles_code        on articles(business_id, code);
create index if not exists idx_customers_business   on customers(business_id);
create index if not exists idx_invoices_business    on invoices(business_id);
create index if not exists idx_invoices_date        on invoices(business_id, invoice_date);
create index if not exists idx_invoice_items_inv    on invoice_items(invoice_id);
create index if not exists idx_settlements_business on daily_settlements(business_id, settlement_date);
