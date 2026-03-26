import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import type { Order } from "../../../lib/types";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function generateToken(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const id    = generateId();
  const token = generateToken();

  const order = {
    id,
    client_name: body.clientName,
    phone:       body.phone,
    address:     body.address,
    lat:         body.lat ?? null,
    lng:         body.lng ?? null,
    items:       body.items,
    total:       body.total,
    status:      "pending",          // ← starts as pending
    confirm_code: token,             // ← stored for verification
    placed_at:   new Date().toISOString(),
  };

  const { error } = await supabaseAdmin.from("orders").insert(order);

  if (error) {
    console.error("Insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Build the confirmation URL
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lapiaggetta.8bit.al";
  const confirmUrl = `${baseUrl}/api/confirm?id=${id}&token=${token}`;

  // Build WhatsApp message (sent to restaurant number as log)
  const waPhone   = process.env.NEXT_PUBLIC_WA_PHONE ?? "393308860293";
  const waMessage = encodeURIComponent(
    `🍕 Confermo il mio ordine #${id}\n👤 ${body.clientName}\n📍 ${body.address}\n\nLink conferma: ${confirmUrl}`
  );
  const waUrl = `https://wa.me/${waPhone}?text=${waMessage}`;

  return NextResponse.json({
    ok:         true,
    id,
    token,
    confirmUrl,
    waUrl,
  });
}
