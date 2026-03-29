import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6).toUpperCase();
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const body = await req.json();
  const { clientName, phone, address, items, subtotal, notes } = body;

  if (!clientName?.trim() || !phone?.trim() || !address?.trim()) {
    return NextResponse.json({ error: "Nome, telefono e indirizzo sono richiesti" }, { status: 400 });
  }

  // Fetch delivery fee
  const { data: feeRow } = await supabaseAdmin
    .from("settings")
    .select("value")
    .eq("business_id", business.id)
    .eq("key", "delivery_fee")
    .maybeSingle();
  const deliveryFee = feeRow ? parseFloat(feeRow.value) || 0 : 0;

  const allItems = [...(items ?? [])];
  if (notes?.trim()) {
    allItems.push({ id: "_notes_", name: notes.trim(), qty: 1, price: 0 });
  }

  const id = generateId();
  const order = {
    id,
    business_id:  business.id,
    client_name:  clientName.trim(),
    phone:        phone.trim(),
    address:      address.trim(),
    lat:          null,
    lng:          null,
    items:        allItems,
    total:        (subtotal ?? 0) + deliveryFee,
    status:       "new",
    confirm_code: "",
    placed_at:    new Date().toISOString(),
    order_type:   "delivery",
  };

  const { error } = await supabaseAdmin.from("orders").insert(order);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id, deliveryFee });
}
