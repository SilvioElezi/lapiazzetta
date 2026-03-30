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

  // Table lookup is optional — walk-in kiosk has no token
  let table: { id: string; name: string } | null = null;
  if (tableToken) {
    const { data } = await supabaseAdmin
      .from("tables")
      .select("id, name")
      .eq("token", tableToken)
      .eq("business_id", business.id)
      .eq("active", true)
      .maybeSingle();
    table = data;
  }

  const allItems = [...(items ?? [])];
  if (notes?.trim()) {
    allItems.push({ id: "_notes_", name: notes.trim(), qty: 1, price: 0 });
  }

  // ── Create open invoice ───────────────────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];
  const { count } = await supabaseAdmin
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("business_id", business.id)
    .eq("invoice_date", today);

  const seq = (count ?? 0) + 1;
  const invoice_number = `INV-${today.replace(/-/g, "")}-${String(seq).padStart(3, "0")}`;

  const invoiceTotal = total ?? 0;
  const vatRate = 10;
  const vatAmount = invoiceTotal * vatRate / (100 + vatRate);

  const { data: invoice, error: invErr } = await supabaseAdmin
    .from("invoices")
    .insert({
      business_id:    business.id,
      invoice_number,
      daily_sequence: seq,
      invoice_date:   today,
      table_id:       table?.id ?? null,
      subtotal:       invoiceTotal - vatAmount,
      vat_amount:     vatAmount,
      total:          invoiceTotal,
      status:         "open",
      invoice_type:   "sale",
      notes:          notes?.trim() || null,
    })
    .select("id")
    .single();

  if (invErr || !invoice) {
    return NextResponse.json({ error: invErr?.message ?? "Invoice creation failed" }, { status: 500 });
  }

  // Insert invoice line items (skip the notes pseudo-item)
  const lineItems = (items ?? []).map((item: { id: string; name: string; qty: number; price: number }, i: number) => ({
    invoice_id:   invoice.id,
    article_name: item.name,
    quantity:     item.qty,
    unit_price:   item.price,
    vat_rate:     vatRate,
    total_price:  item.price * item.qty,
    line_order:   i,
  }));

  if (lineItems.length > 0) {
    await supabaseAdmin.from("invoice_items").insert(lineItems);
  }

  // ── Create order ──────────────────────────────────────────────────────────
  const id = generateId();
  const order = {
    id,
    business_id: business.id,
    client_name: clientName?.trim() || "Ospite",
    phone: "",
    address: table?.name ?? "Kiosk",
    items: allItems,
    total: invoiceTotal,
    status: "new",
    confirm_code: "",
    placed_at: new Date().toISOString(),
    table_name: table?.name ?? null,
    order_type: "kiosk",
    invoice_id: invoice.id,
  };

  const { error } = await supabaseAdmin.from("orders").insert(order);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id, invoice_id: invoice.id });
}
