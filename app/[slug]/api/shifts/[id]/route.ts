import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;

  const { data: business } = await supabaseAdmin
    .from("businesses").select("id").eq("slug", slug).single();
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { action, amount, confirmedBy } = body;

  const { data: shift } = await supabaseAdmin
    .from("delivery_shifts")
    .select("*")
    .eq("id", id)
    .eq("business_id", business.id)
    .single();

  if (!shift) return NextResponse.json({ error: "Turno non trovato" }, { status: 404 });

  if (action === "add_delivery") {
    // Delivery guy marked an order as delivered — add amount to shift
    const { error } = await supabaseAdmin
      .from("delivery_shifts")
      .update({
        total_collected:  shift.total_collected + (parseFloat(amount) || 0),
        deliveries_count: shift.deliveries_count + 1,
      })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "close") {
    // Delivery guy closes their shift
    if (shift.status !== "active") return NextResponse.json({ error: "Turno non attivo" }, { status: 400 });
    const { error } = await supabaseAdmin
      .from("delivery_shifts")
      .update({ status: "pending_handover", closed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "confirm") {
    // Receptionist/admin confirms cash received
    if (shift.status !== "pending_handover") return NextResponse.json({ error: "Turno non in attesa" }, { status: 400 });
    const { error } = await supabaseAdmin
      .from("delivery_shifts")
      .update({
        status:       "closed",
        confirmed_at: new Date().toISOString(),
        confirmed_by: confirmedBy ?? "reception",
      })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Azione non valida" }, { status: 400 });
}
