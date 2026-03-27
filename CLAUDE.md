# La Piazzetta — Pizza ordering app

## Stack
- Next.js 16 (App Router, Turbopack)
- Supabase (orders + menu + staff + settings tables)
- Deployed on Vercel at lapiaggetta.8bit.al

## Key files
- components/CheckoutDrawer.tsx — customer ordering flow
- components/MenuGrid.tsx — pill-style menu
- app/shop/page.tsx — staff dashboard (reception/delivery/admin roles)
- lib/supabase.ts — browser client (anon key only)
- lib/supabase-admin.ts — server-only client (service role key)
- lib/haversine.ts — distance calculation utility
- hooks/useGeolocation.ts — GPS hook

## Rules
- API routes MUST import from lib/supabase-admin.ts (not lib/supabase.ts)
- Client components MUST import from lib/supabase.ts only
- All orders start as status "pending", confirmed via WhatsApp → become "new"
- Delivery radius: 5km from lat:45.5333, lng:9.9167
