import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET  — open invoices for a business (used to show which tables are occupied)
//        optional ?table_id=xxx to filter by table
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const tableId = searchParams.get("table_id");

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let query = supabaseAdmin
    .from("invoices")
    .select("id, table_id, total, status, created_at, invoice_items(id, article_name, quantity, unit_price, vat_rate, total_price, line_order)")
    .eq("business_id", business.id)
    .eq("status", "open");

  if (tableId) query = query.eq("table_id", tableId);

  const { data: invoices, error } = await query.order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ invoices: invoices || [] });
}

// POST — create a new invoice (open or paid) with its line items
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { table_id, employee_id, items, subtotal, vat_amount, total, status = "paid", payment_method: pm = "cash" } =
    await req.json();

  if (!items?.length) {
    return NextResponse.json({ error: "No items" }, { status: 400 });
  }

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const today = new Date().toISOString().split("T")[0];

  // Daily sequence number
  const { count } = await supabaseAdmin
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("business_id", business.id)
    .eq("invoice_date", today);

  const seq = (count ?? 0) + 1;
  const invoice_number = `INV-${today.replace(/-/g, "")}-${String(seq).padStart(3, "0")}`;

  // Create the invoice
  const { data: invoice, error: invErr } = await supabaseAdmin
    .from("invoices")
    .insert({
      business_id:    business.id,
      invoice_number,
      daily_sequence: seq,
      invoice_date:   today,
      table_id:       table_id ?? null,
      employee_id:    employee_id ?? null,
      subtotal,
      vat_amount,
      total,
      status,
      payment_method: pm,
      invoice_type:   "sale",
      completed_at:   status === "paid" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (invErr || !invoice) {
    return NextResponse.json({ error: invErr?.message ?? "Insert failed" }, { status: 500 });
  }

  // Create line items
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: itemsErr } = await supabaseAdmin.from("invoice_items").insert(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items.map((item: any, i: number) => ({
      invoice_id:   invoice.id,
      article_id:   item.article_id ?? null,
      article_code: item.article_code ?? null,
      article_name: item.article_name,
      quantity:     item.quantity,
      unit_price:   item.unit_price,
      vat_rate:     item.vat_rate ?? 10,
      total_price:  item.total_price,
      line_order:   i,
    }))
  );

  if (itemsErr) {
    await supabaseAdmin.from("invoices").delete().eq("id", invoice.id);
    return NextResponse.json({ error: itemsErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, invoice_id: invoice.id, invoice_number });
}
