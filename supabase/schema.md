# Supabase Schema — La Piazzetta
# Generated 2026-03-30

## Entity Relationship Overview

```
businesses (root)
├── staff           (login, roles)
├── tables          (physical tables → venues)
├── menu            (food categories + items as JSONB)
├── orders          (live delivery/kiosk queue)
├── invoices        (POS financial records)
│   └── invoice_items
├── articles        (BarPRO products from Oracle)
│   └── vat_rates
├── customers
├── venues
├── delivery_shifts
├── daily_settlements
└── settings        (key/value config per business)
```

---

## businesses
| column | type | nullable | default |
|--------|------|----------|---------|
| id | uuid PK | NO | gen_random_uuid() |
| slug | text | NO | — |
| name | text | NO | — |
| logo_url | text | YES | — |
| phone | text | YES | — |
| wa_phone | text | YES | — |
| address | text | YES | — |
| lat | double precision | YES | — |
| lng | double precision | YES | — |
| radius_km | double precision | NO | 5 |
| created_at | timestamptz | NO | now() |
| subscription_expires_at | timestamptz | YES | — |

## staff
| column | type | nullable | default |
|--------|------|----------|---------|
| id | integer PK (serial) | NO | nextval |
| business_id | uuid → businesses | YES | — |
| username | text | NO | — |
| password | text | NO | — |
| role | text | NO | — (admin/reception/delivery) |
| name | text | NO | — |
| pin | text | YES | — |
| active | boolean | YES | true |
| created_at | timestamptz | YES | now() |
| employee_code | text | YES | — |

## tables
| column | type | nullable | default |
|--------|------|----------|---------|
| id | uuid PK | NO | gen_random_uuid() |
| business_id | uuid → businesses | YES | — |
| venue_id | uuid → venues | YES | — |
| name | text | NO | — |
| token | text | YES | random hex (for kiosk QR) |
| active | boolean | YES | true |
| capacity | integer | YES | — |
| table_number | integer | YES | — |
| created_at | timestamptz | YES | now() |

## menu
> One row per category. Items stored as JSONB array inside each row.
> Each item: { id, name, ingredients, price, popular, spicy, vegetarian, active, image_url, options? }

| column | type | nullable | default |
|--------|------|----------|---------|
| id | integer PK (serial) | NO | nextval |
| business_id | uuid → businesses | YES | — |
| category | text | NO | — |
| emoji | text | NO | '🍕' |
| sort_order | integer | NO | 0 |
| items | jsonb | NO | '[]' |
| main_category | text | YES | 'Pizzeria' |

## orders
> Live delivery/kiosk order queue. NOT financial records.
> status: new → ready → (deleted on delivery)

| column | type | nullable | default |
|--------|------|----------|---------|
| id | text PK | NO | — |
| business_id | uuid → businesses | YES | — |
| client_name | text | NO | — |
| phone | text | NO | — |
| address | text | NO | — |
| lat | double precision | YES | — |
| lng | double precision | YES | — |
| items | jsonb | NO | — |
| total | numeric | NO | — |
| status | text | NO | 'new' |
| placed_at | timestamptz | NO | now() |
| confirm_code | text | YES | — |
| table_name | text | YES | — (kiosk orders) |
| order_type | text | NO | 'delivery' |

## settings
> Key/value store per business.
> Known keys: online_orders, hours, delivery_fee, sections

| column | type | nullable | default |
|--------|------|----------|---------|
| business_id | uuid → businesses | YES | — |
| key | text | NO | — |
| value | jsonb | NO | — |

## vat_rates
| column | type | nullable | default |
|--------|------|----------|---------|
| id | integer PK (serial) | NO | nextval |
| business_id | uuid → businesses | NO | — |
| code | text | NO | — |
| rate | numeric | NO | — |
| name | text | YES | — |
| is_default | boolean | YES | false |
| created_at | timestamptz | YES | now() |

## articles
> BarPRO products imported from Oracle. Read-only from app side.
> category is TEXT (string of number: "1","2",...,"14")

| column | type | nullable | default |
|--------|------|----------|---------|
| id | uuid PK | NO | gen_random_uuid() |
| business_id | uuid → businesses | NO | — |
| code | text | NO | — (BarPRO article_code) |
| name | text | NO | — |
| description | text | YES | — |
| price | numeric | NO | 0 |
| cost_price | numeric | YES | — |
| vat_rate_id | integer → vat_rates | YES | — |
| category | text | YES | — ("1"–"14") |
| quantity_on_hand | numeric | YES | 0 |
| superior_article_id | uuid → articles | YES | — |
| printer_id | text | YES | — |
| active | boolean | YES | true |
| sort_order | integer | YES | 0 |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |
| created_by | text | YES | — |

## customers
| column | type | nullable | default |
|--------|------|----------|---------|
| id | uuid PK | NO | gen_random_uuid() |
| business_id | uuid → businesses | NO | — |
| name | text | NO | — |
| phone | text | YES | — |
| email | text | YES | — |
| address | text | YES | — |
| address_line2 | text | YES | — |
| tax_id | text | YES | — |
| discount_pct | numeric | YES | 0 |
| notes | text | YES | — |
| active | boolean | YES | true |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |

## venues
| column | type | nullable | default |
|--------|------|----------|---------|
| id | uuid PK | NO | gen_random_uuid() |
| business_id | uuid → businesses | NO | — |
| name | text | NO | — |
| address | text | YES | — |
| address_2 | text | YES | — |
| phone | text | YES | — |
| tax_id | text | YES | — |
| is_primary | boolean | YES | false |
| active | boolean | YES | true |
| created_at | timestamptz | YES | now() |

## invoices
> Permanent financial records created by POS cashier.
> status: open → paid | cancelled

| column | type | nullable | default |
|--------|------|----------|---------|
| id | uuid PK | NO | gen_random_uuid() |
| business_id | uuid → businesses | NO | — |
| invoice_number | text | YES | INV-YYYYMMDD-NNN |
| daily_sequence | integer | YES | — |
| invoice_date | date | NO | CURRENT_DATE |
| invoice_type | text | NO | 'sale' |
| table_id | uuid → tables | YES | — |
| customer_id | uuid → customers | YES | — |
| employee_id | integer → staff.id | YES | — |
| status | text | NO | 'open' |
| subtotal | numeric | YES | 0 |
| vat_amount | numeric | YES | 0 |
| discount_amount | numeric | YES | 0 |
| total | numeric | YES | 0 |
| payment_method | text | YES | cash/card |
| notes | text | YES | — |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |
| completed_at | timestamptz | YES | — |
| created_by | text | YES | — |

## invoice_items
| column | type | nullable | default |
|--------|------|----------|---------|
| id | uuid PK | NO | gen_random_uuid() |
| invoice_id | uuid → invoices | NO | — |
| article_id | uuid → articles | YES | null for menu items |
| article_code | text | YES | — |
| article_name | text | NO | snapshot at time of sale |
| quantity | numeric | NO | — |
| unit_price | numeric | NO | — |
| vat_rate | numeric | YES | 0 |
| discount_pct | numeric | YES | 0 |
| total_price | numeric | NO | — |
| notes | text | YES | — |
| line_order | integer | YES | 0 |

## delivery_shifts
| column | type | nullable | default |
|--------|------|----------|---------|
| id | uuid PK | NO | gen_random_uuid() |
| business_id | uuid → businesses | NO | — |
| staff_id | text | NO | — |
| staff_name | text | NO | — |
| initial_float | numeric | NO | 0 |
| total_collected | numeric | NO | 0 |
| deliveries_count | integer | NO | 0 |
| status | text | NO | 'active' |
| started_at | timestamptz | NO | now() |
| closed_at | timestamptz | YES | — |
| confirmed_at | timestamptz | YES | — |
| confirmed_by | text | YES | — |

## daily_settlements
| column | type | nullable | default |
|--------|------|----------|---------|
| id | uuid PK | NO | gen_random_uuid() |
| business_id | uuid → businesses | NO | — |
| settlement_date | date | NO | — |
| invoice_count | integer | YES | 0 |
| total_sales | numeric | YES | 0 |
| total_vat | numeric | YES | 0 |
| cash_total | numeric | YES | 0 |
| card_total | numeric | YES | 0 |
| status | text | YES | 'open' |
| closed_by | text | YES | — |
| closed_at | timestamptz | YES | — |

---

## Key design notes

1. **Two product sources**: `articles` (183 BarPRO/Oracle items) + `menu` (59 food items as JSONB)
   - Articles are managed by BarPRO software, read-only from app
   - Menu is managed by admin in the POS Menu tab

2. **Two order concepts**:
   - `orders` = live queue (delivery + kiosk), ephemeral, deleted on completion
   - `invoices` = permanent financial records, created by POS cashier

3. **menu.items is JSONB** — entire category's items in one column, not normalized rows

4. **staff.id is INTEGER** (serial), not uuid — invoices.employee_id is INTEGER to match

5. **settings** is a flat key/value store:
   - `online_orders` → boolean
   - `hours` → WeekHours object
   - `delivery_fee` → number
   - `sections` → [{name, emoji}] array
