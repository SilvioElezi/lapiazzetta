# BarPRO → Supabase Migration

Reads data from Oracle XE (running locally) and inserts it into Supabase.

## Requirements

- Node.js 18+
- Oracle XE 10g running on `localhost:1521` with user `bar`/`bar`
- Oracle Instant Client 11.2 (32-bit) DLLs in the BarPRO app directory (already set up)

## Setup

```bash
cd scripts/migrate
npm install
cp .env.migrate.example .env.migrate
# edit .env.migrate with your Supabase URL and service role key
```

## Run order

Always run in this order — later steps depend on earlier ones:

```bash
# 1. Preview everything first (no writes to Supabase)
node migrate.js --dry-run

# 2. Migrate VAT rates first (articles depend on them)
node migrate.js --only=vat

# 3. Migrate articles
node migrate.js --only=articles

# 4. Migrate staff/employees
node migrate.js --only=staff

# 5. Migrate customers
node migrate.js --only=customers

# Or migrate everything at once
node migrate.js
```

## Before running

1. Run `001_phase1_schema.sql` in the Supabase SQL Editor to create the tables
2. Make sure the `businesses` table has a row for your business slug (e.g. `lapiazzetta`)
3. Oracle XE must be running: check Windows Services for `OracleServiceXE`

## After migration

- Open Supabase Table Editor and verify row counts
- Check article names and prices look correct
- Rename staff accounts from `emp_0`, `emp_1` → real names
- Set secure PINs for all staff (migration copies original PINs as temporary values)
