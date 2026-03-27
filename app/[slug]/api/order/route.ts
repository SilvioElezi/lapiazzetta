import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { haversineKm } from "@/lib/haversine";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function generateToken(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { data: business, error: bizErr } = await supabaseAdmin
    .from("businesses")
    .select("id, slug, name, wa_phone, lat, lng, radius_km")
    .eq("slug", slug)
    .single();

  if (bizErr || !business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const body = await req.json();

  // Haversine distance validation (only when GPS coords provided)
  if (body.lat != null && body.lng != null && business.lat != null && business.lng != null) {
    const dist = haversineKm(business.lat, business.lng, body.lat, body.lng);
    if (dist > business.radius_km) {
      return NextResponse.json(
        { error: `Fuori dalla zona di consegna (${dist.toFixed(1)} km, max ${business.radius_km} km)` },
        { status: 422 }
      );
    }
  }

  const id    = generateId();
  const token = generateToken();

  const order = {
    id,
    business_id:  business.id,
    client_name:  body.clientName,
    phone:        body.phone,
    address:      body.address,
    lat:          body.lat ?? null,
    lng:          body.lng ?? null,
    items:        body.items,
    total:        body.total,
    status:       "pending",
    confirm_code: token,
    placed_at:    new Date().toISOString(),
  };

  const { error } = await supabaseAdmin.from("orders").insert(order);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const baseUrl    = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lapiaggetta.8bit.al";
  const confirmUrl = `${baseUrl}/${slug}/api/confirm?id=${id}&token=${token}`;

  const waPhone   = (business.wa_phone ?? "393308860293").replace(/\D/g, "");
  const waMessage = encodeURIComponent(
    `🍕 Confermo il mio ordine #${id}\n👤 ${body.clientName}\n📍 ${body.address}\n\nLink conferma: ${confirmUrl}`
  );
  const waUrl = `https://wa.me/${waPhone}?text=${waMessage}`;

  return NextResponse.json({ ok: true, id, token, confirmUrl, waUrl });
}
