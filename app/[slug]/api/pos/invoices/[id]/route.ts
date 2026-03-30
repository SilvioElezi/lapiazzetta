import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET — single invoice with items
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { id } = await params;

  const { data: invoice, error } = await supabaseAdmin
    .from("invoices")
    .select("*, invoice_items(*, id, article_id, article_name, quantity, unit_price, vat_rate, total_price, line_order)")
    .eq("id", id)
    .single();

  if (error || !invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ invoice });
}

// PATCH — pay or cancel an open invoice
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { id } = await params;
  const { status, payment_method } = await req.json();

  if (!["paid", "cancelled"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("invoices")
    .update({
      status,
      payment_method: payment_method ?? "cash",
      completed_at:   new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
