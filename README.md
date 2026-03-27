# La Piazzetta — Pizza Ordering Platform

A multi-tenant online ordering system for pizzerias. Customers browse the menu, place orders and confirm via SMS OTP. Staff manage incoming orders through a real-time dashboard with role-based access.

**Live:** [lapiaggetta.8bit.al](https://lapiaggetta.8bit.al)

---

## Features

- **Multi-tenant** — one codebase, multiple pizzerias each with their own URL (`/[slug]`)
- **Customer ordering** — menu browsing, cart, GPS address detection, SMS OTP confirmation
- **Staff dashboard** — live order queue with reception, delivery and admin roles
- **Super admin** — create and manage businesses, upload logos
- **SMS OTP** — 4-digit code sent via a local TP-Link router using [sms-bridge](https://github.com/SilvioElezi/sms-bridge)
- **Telegram notifications** — order updates pushed to a Telegram chat
- **Delivery radius** — GPS-based Haversine check, rejects orders outside the configured zone

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Database | Supabase (Postgres + Storage) |
| Hosting | Vercel |
| SMS | TP-Link router + [sms-bridge](https://github.com/SilvioElezi/sms-bridge) |
| Notifications | Telegram Bot API |

---

## URL structure

```
/                        → root landing page
/[slug]                  → customer storefront  (e.g. /lapiazzetta)
/[slug]/shop             → staff dashboard
/admin                   → super admin panel
```

All API routes live under `/[slug]/api/` and are scoped to the business by slug, so data from one tenant never leaks to another.

---

## Order flow

```
Customer places order
        │
        ▼
Order saved (status: pending)
        │
        ▼
SMS OTP sent to customer's phone via sms-bridge
        │
        ▼
Customer enters 4-digit code on site
        │
        ▼
Order confirmed (status: new) → appears in staff dashboard
        │
        ▼
Staff marks ready / out for delivery → Telegram notification sent
```

---

## Project structure

```
app/
├── [slug]/              # customer-facing pages and API routes
│   ├── page.tsx         # storefront
│   ├── shop/page.tsx    # staff dashboard
│   └── api/             # order, confirm, menu, auth, settings...
├── admin/               # super admin panel
└── layout.tsx / page.tsx

components/
├── CheckoutDrawer.tsx   # full checkout + OTP flow
├── MenuGrid.tsx         # pill-style menu
├── Hero.tsx
├── InfoSection.tsx
├── CartContext.tsx      # cart state (React Context)
└── ...

lib/
├── supabase.ts          # browser client (anon key)
├── supabase-admin.ts    # server-only client (service role key)
├── types.ts             # shared TypeScript types
└── haversine.ts         # delivery radius calculation

sms-bridge/              # standalone SMS service (separate repo)
```

---

## Database tables (Supabase)

| Table | Purpose |
|---|---|
| `businesses` | tenant config — slug, name, logo, coordinates, radius |
| `orders` | customer orders with status, OTP code, GPS coords |
| `menu` | menu items per business |
| `staff` | staff accounts with roles (reception / delivery / admin) |
| `settings` | per-business key-value settings (e.g. online_orders on/off) |

---

## Environment variables

Create a `.env.local` file at the project root:

```env
# Supabase — get these from your Supabase project settings
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# SMS bridge — the URL exposed by Cloudflare Tunnel
SMS_BRIDGE_URL=https://sms.yourdomain.com
BRIDGE_SECRET=same-secret-as-in-sms-bridge-env

# Telegram notifications (optional)
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_LOG_CHAT_ID=-100123456789

# Super admin panel password
SUPER_ADMIN_PASSWORD=your-admin-password
```

---

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/SilvioElezi/lapiazzetta.git
cd lapiazzetta
npm install
```

### 2. Set up Supabase

Create a Supabase project and run the following SQL to set up the schema:

```sql
create table businesses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  phone text,
  wa_phone text,
  address text,
  lat float,
  lng float,
  radius_km float default 5,
  logo_url text
);

create table orders (
  id text primary key,
  business_id uuid references businesses(id),
  client_name text,
  phone text,
  address text,
  lat float,
  lng float,
  items jsonb,
  total float,
  status text default 'pending',
  confirm_code text,
  placed_at timestamptz default now()
);

create table menu (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id),
  name text,
  description text,
  price float,
  category text,
  available boolean default true
);

create table staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id),
  username text,
  password text,
  role text  -- reception | delivery | admin
);

create table settings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id),
  key text,
  value text,
  unique (business_id, key)
);
```

### 3. Set up the SMS bridge

The OTP system requires the [sms-bridge](https://github.com/SilvioElezi/sms-bridge) service running on a machine connected to your TP-Link 4G router. Follow the setup instructions in that repo, then expose it with a Cloudflare Tunnel and add the URL to your `.env.local`.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploying to Vercel

1. Push to GitHub
2. Import the repo in [vercel.com](https://vercel.com)
3. Add all environment variables from the list above
4. Vercel auto-deploys on every push to `main`

---

## Key rules (for contributors)

- API routes **must** import from `lib/supabase-admin.ts` — never from `lib/supabase.ts`
- Client components **must** import from `lib/supabase.ts` — never from `lib/supabase-admin.ts`
- Every Supabase query in an API route must filter by `business_id` to maintain tenant isolation
- Orders start as `pending`, become `new` only after SMS OTP confirmation

---

## Related

- [sms-bridge](https://github.com/SilvioElezi/sms-bridge) — the companion service that sends SMS via TP-Link router
