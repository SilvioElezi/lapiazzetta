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

// PATCH — pay/cancel an open invoice, OR replace its items
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = await req.json();
  const { status, payment_method, action, items, subtotal, vat_amount, total } = body;

  // ── Update items on an open invoice ──────────────────────────────────────
  if (action === "update_items") {
    if (!items?.length) return NextResponse.json({ error: "No items" }, { status: 400 });

    const { error: delErr } = await supabaseAdmin
      .from("invoice_items")
      .delete()
      .eq("invoice_id", id);

    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insErr } = await supabaseAdmin.from("invoice_items").insert(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items.map((item: any, i: number) => ({
        invoice_id:   id,
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

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

    const { error: updErr } = await supabaseAdmin
      .from("invoices")
      .update({ subtotal, vat_amount, total })
      .eq("id", id);

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  }

  // ── Transfer invoice to another table ────────────────────────────────────
  if (action === "transfer") {
    const { table_id: newTableId } = body;
    if (!newTableId) return NextResponse.json({ error: "No target table" }, { status: 400 });

    const { error: tErr } = await supabaseAdmin
      .from("invoices")
      .update({ table_id: newTableId })
      .eq("id", id);

    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // ── Close or cancel ───────────────────────────────────────────────────────
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
