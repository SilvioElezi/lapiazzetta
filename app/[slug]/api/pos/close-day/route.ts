import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET — summary of today's invoices (for the close-day preview)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const today = new Date().toISOString().split("T")[0];

  // Check if already closed today
  const { data: existing } = await supabaseAdmin
    .from("daily_settlements")
    .select("id, status, closed_at")
    .eq("business_id", business.id)
    .eq("settlement_date", today)
    .single();

  if (existing?.status === "closed") {
    return NextResponse.json({ already_closed: true, closed_at: existing.closed_at });
  }

  // Get all invoices for today (paid + open)
  const { data: invoices } = await supabaseAdmin
    .from("invoices")
    .select("id, status, total, vat_amount, payment_method")
    .eq("business_id", business.id)
    .eq("invoice_date", today);

  const all = invoices ?? [];
  const paid = all.filter(i => i.status === "paid");
  const open = all.filter(i => i.status === "open");
  const cancelled = all.filter(i => i.status === "cancelled");

  const cashTotal = paid.filter(i => i.payment_method === "cash").reduce((s, i) => s + Number(i.total), 0);
  const cardTotal = paid.filter(i => i.payment_method === "card").reduce((s, i) => s + Number(i.total), 0);
  const totalSales = paid.reduce((s, i) => s + Number(i.total), 0);
  const totalVat = paid.reduce((s, i) => s + Number(i.vat_amount ?? 0), 0);
  const openTotal = open.reduce((s, i) => s + Number(i.total), 0);

  return NextResponse.json({
    already_closed: false,
    date: today,
    invoice_count: paid.length,
    open_count: open.length,
    cancelled_count: cancelled.length,
    total_sales: totalSales,
    total_vat: totalVat,
    cash_total: cashTotal,
    card_total: cardTotal,
    open_total: openTotal,
  });
}

// POST — close the day: mark all open invoices as paid, insert daily_settlement
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await req.json();
  const { closed_by } = body;

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const today = new Date().toISOString().split("T")[0];

  // Check if already closed
  const { data: existing } = await supabaseAdmin
    .from("daily_settlements")
    .select("id, status")
    .eq("business_id", business.id)
    .eq("settlement_date", today)
    .single();

  if (existing?.status === "closed") {
    return NextResponse.json({ error: "Giornata già chiusa" }, { status: 400 });
  }

  // Close all open invoices as paid (cash)
  await supabaseAdmin
    .from("invoices")
    .update({ status: "paid", payment_method: "cash", completed_at: new Date().toISOString() })
    .eq("business_id", business.id)
    .eq("invoice_date", today)
    .eq("status", "open");

  // Recalculate totals after closing open invoices
  const { data: invoices } = await supabaseAdmin
    .from("invoices")
    .select("id, status, total, vat_amount, payment_method")
    .eq("business_id", business.id)
    .eq("invoice_date", today)
    .eq("status", "paid");

  const all = invoices ?? [];
  const cashTotal = all.filter(i => i.payment_method === "cash").reduce((s, i) => s + Number(i.total), 0);
  const cardTotal = all.filter(i => i.payment_method === "card").reduce((s, i) => s + Number(i.total), 0);
  const totalSales = all.reduce((s, i) => s + Number(i.total), 0);
  const totalVat = all.reduce((s, i) => s + Number(i.vat_amount ?? 0), 0);

  // Upsert daily settlement
  const { error } = await supabaseAdmin
    .from("daily_settlements")
    .upsert({
      business_id: business.id,
      settlement_date: today,
      invoice_count: all.length,
      total_sales: totalSales,
      total_vat: totalVat,
      cash_total: cashTotal,
      card_total: cardTotal,
      status: "closed",
      closed_by: closed_by ?? null,
      closed_at: new Date().toISOString(),
    }, { onConflict: "business_id,settlement_date" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, total_sales: totalSales, invoice_count: all.length });
}
