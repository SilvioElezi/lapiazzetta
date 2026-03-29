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
  const { tableToken, clientName, items, total, notes } = body;

  if (!tableToken) return NextResponse.json({ error: "Token tavolo mancante" }, { status: 400 });

  const { data: table } = await supabaseAdmin
    .from("tables")
    .select("id, name")
    .eq("token", tableToken)
    .eq("business_id", business.id)
    .eq("active", true)
    .maybeSingle();

  if (!table) return NextResponse.json({ error: "Tavolo non valido o non attivo" }, { status: 400 });

  const allItems = [...(items ?? [])];
  if (notes?.trim()) {
    allItems.push({ id: "_notes_", name: notes.trim(), qty: 1, price: 0 });
  }

  const id = generateId();
  const order = {
    id,
    business_id: business.id,
    client_name: clientName?.trim() || "Ospite",
    phone: "",
    address: table.name,
    items: allItems,
    total: total ?? 0,
    status: "new",
    confirm_code: "",
    placed_at: new Date().toISOString(),
    table_name: table.name,
    order_type: "kiosk",
  };

  const { error } = await supabaseAdmin.from("orders").insert(order);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id });
}
