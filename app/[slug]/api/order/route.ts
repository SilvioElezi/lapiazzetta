import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { haversineKm } from "@/lib/haversine";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function generateOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

async function sendSmsOtp(phone: string, otp: string): Promise<void> {
  const bridgeUrl = process.env.SMS_BRIDGE_URL;
  const secret    = process.env.BRIDGE_SECRET;
  if (!bridgeUrl || !secret) {
    console.warn("[sms] SMS_BRIDGE_URL or BRIDGE_SECRET not set — skipping SMS");
    return;
  }
  const res = await fetch(`${bridgeUrl}/send-sms`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", "x-bridge-secret": secret },
    body:    JSON.stringify({ to: phone, message: `Il tuo codice di conferma ordine è: ${otp}` }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `SMS bridge error ${res.status}`);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { data: business, error: bizErr } = await supabaseAdmin
    .from("businesses")
    .select("id, slug, name, lat, lng, radius_km")
    .eq("slug", slug)
    .single();

  if (bizErr || !business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const body = await req.json();

  // Haversine distance validation
  if (body.lat != null && body.lng != null && business.lat != null && business.lng != null) {
    const dist = haversineKm(business.lat, business.lng, body.lat, body.lng);
    if (dist > business.radius_km) {
      return NextResponse.json(
        { error: `Fuori dalla zona di consegna (${dist.toFixed(1)} km, max ${business.radius_km} km)` },
        { status: 422 }
      );
    }
  }

  // Fetch delivery fee from settings
  const { data: feeRow } = await supabaseAdmin
    .from("settings")
    .select("value")
    .eq("business_id", business.id)
    .eq("key", "delivery_fee")
    .maybeSingle();
  const deliveryFee = feeRow ? parseFloat(feeRow.value) || 0 : 0;

  const id  = generateId();
  const otp = generateOtp();

  const order = {
    id,
    business_id:  business.id,
    client_name:  body.clientName,
    phone:        body.phone,
    address:      body.address,
    lat:          body.lat ?? null,
    lng:          body.lng ?? null,
    items:        body.items,
    total:        (body.total ?? 0) + deliveryFee,
    status:       "pending",
    confirm_code: otp,
    placed_at:    new Date().toISOString(),
  };

  const { error } = await supabaseAdmin.from("orders").insert(order);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send OTP via SMS bridge (non-blocking on error — order is saved regardless)
  try {
    await sendSmsOtp(body.phone, otp);
  } catch (smsErr) {
    console.error("[sms] failed to send OTP:", smsErr);
    // Don't fail the order — customer can still confirm if we return the otp in dev
  }

  return NextResponse.json({ ok: true, id });
}
