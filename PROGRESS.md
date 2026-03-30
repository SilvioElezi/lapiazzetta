# La Piazzetta POS — Development Progress
_Last updated: 2026-03-31_

---

## Vision
Replace BarPRO as the primary POS system. All channels (Cassa, Kiosk, Online) use the
same unified product catalog. Every order — regardless of channel — generates an invoice.
Workers have individual reporting. Admin has full control.

---

## Step 1 — Unified Product & Order Foundation ✅ DONE

### Products
- [x] Single `articles` table as source of truth (BarPRO items + Piazzetta food items merged)
- [x] Added columns: `category_label`, `section_name`, `image_url`, `options`, `show_cassa`, `show_kiosk`, `show_online`
- [x] SQL migration: BarPRO articles labeled, Piazzetta menu items migrated into articles
- [x] Bar category rows created in `menu` table for UI grouping
- [x] Admin Menu tab: manages all products (add / edit / delete / toggle active)
- [x] Visibility checkboxes per product (🏠 Cassa · 🪑 Kiosk · 🌐 Online)
- [x] POS articles API: filters by `show_cassa=true` (default), `?context=kiosk`, `?context=online`, `?admin=1`

### POS Cassa (table ordering)
- [x] Merged "Ordine" + "Cassa" tabs into one unified Cassa tab
- [x] Two-level sidebar: Section buttons (Bar / Pizzeria) → sub-categories
- [x] Select table → load existing open invoice if table occupied (table turns amber)
- [x] "Invia al tavolo" → creates open invoice (status: open), table turns amber
- [x] Can add more items to same table (replaces invoice items via PATCH)
- [x] "Chiudi tavolo" → payment modal (💵 Contanti / 💳 Bancomat) → invoice closed (paid)
- [x] Tables tab: add/delete tables, generate QR codes

### Kiosk
- [x] Walk-in AIO mode: works without QR token (no table required)
- [x] QR token mode still supported (table-specific orders)
- [x] Filters products by `show_kiosk=true`
- [x] On order confirm → auto-creates open invoice linked to table (or table_id=null for walk-in)
- [x] Order + invoice both created atomically in `kiosk-order` API

### Online ordering
- [x] `/api/menu` public endpoint returns articles with `show_online=true` grouped by category
- [x] Online menu (MenuGrid) shows only online-enabled products

### Settings
- [x] Sections management (Bar, Pizzeria, etc.) — configurable per business
- [x] "Link utili" card: 📋 copy buttons for Online Menu URL and Kiosk URL
- [x] Online orders toggle, delivery fee, opening hours

---

## Step 2 — Online Order Acceptance Flow 🔲 TODO

**Goal:** When a customer places an order online it enters a "pending" state.
Admin reviews it in the Orders tab, accepts it → invoice is created automatically.
Rejected orders notify the customer.

- [ ] Add `status = 'pending'` to online orders (currently goes straight to 'new')
- [ ] Orders tab: show pending online orders with Accept / Reject buttons
- [ ] Accept → create invoice (status: open or paid depending on payment)
- [ ] Reject → mark order cancelled, optionally send WhatsApp message
- [ ] Link `orders.invoice_id` on acceptance
- [ ] Show order source badge (🌐 Online · 🪑 Kiosk · 📞 Telefono)

---

## Step 3 — Worker Reporting 🔲 TODO

**Goal:** Every staff member sees their own sales. Admin sees everyone's.

- [ ] New "Report" tab in POS (visible to all roles)
- [ ] Worker view: invoices where `employee_id = me`, today + date range filter
  - Total sales, number of invoices, cash vs card breakdown
- [ ] Admin view: same but for all employees, with per-employee breakdown table
- [ ] `invoices.employee_id` already set when cashier closes a table (use logged-in user id)
- [ ] Delivery shifts already tracked separately (existing ShiftsTab)

---

## Step 4 — Staff Management UI 🔲 TODO

**Goal:** Admin can manage staff without going into Supabase dashboard.

- [ ] New "Staff" section in Settings tab (admin only)
- [ ] List all staff with role, name, active status
- [ ] Create new staff: name, username, password, role (admin / reception / delivery), display_role
- [ ] Edit existing: change role, reset password, toggle active
- [ ] Delete staff (soft delete: set `active = false`)
- [ ] `display_role` field (e.g. "Cameriere", "Barista") already added to DB

---

## Step 5 — Kiosk Card Payment (Self-checkout) 🔲 TODO

**Goal:** Customer at kiosk can pay by card directly, invoice auto-closes.

- [ ] Integrate payment terminal SDK (Stripe Terminal or SumUp)
- [ ] Kiosk checkout: show payment method choice (💵 Paga alla cassa · 💳 Paga qui)
- [ ] Card payment → on success → PATCH invoice to status: paid, payment_method: card
- [ ] "Paga alla cassa" keeps existing flow (open invoice, cashier closes)
- [ ] Receipt / confirmation screen after payment

---

## Step 6 — Daily Settlement & Financial Reports 🔲 TODO

**Goal:** End-of-day closing procedure for admin/cashier.

- [ ] "Chiudi giornata" button in POS (admin only)
- [ ] Calculates totals from all paid invoices for today
- [ ] Creates row in `daily_settlements` table
- [ ] Prints/shows Z-report: total sales, VAT breakdown, cash vs card, invoice count
- [ ] Prevents closing if any invoices still open (or warns)
- [ ] History view: past settlements

---

## Database — Migrations Applied

| Migration | Date | Status |
|-----------|------|--------|
| Add show_cassa/show_online/show_kiosk to articles | 2026-03-30 | ✅ |
| Add invoice_id to orders | 2026-03-30 | ✅ |
| Add display_role to staff | 2026-03-30 | ✅ |
| Add category_label, image_url, options, section_name to articles | 2026-03-31 | ✅ |
| Migrate menu JSONB items → articles rows | 2026-03-31 | ✅ |
| Create bar category rows in menu table | 2026-03-31 | ✅ |

---

## Tech Stack
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend:** Supabase (PostgreSQL), supabaseAdmin (service role)
- **Hosting:** Vercel
- **Repo:** github.com/SilvioElezi/lapiazzetta
