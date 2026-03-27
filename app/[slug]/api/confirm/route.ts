import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { id, otp } = await req.json();

  if (!id || !otp) {
    return NextResponse.json({ error: "Missing id or otp" }, { status: 400 });
  }

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("id, status, confirm_code, client_name")
    .eq("id", id)
    .eq("business_id", business.id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "Ordine non trovato o scaduto" }, { status: 404 });
  }

  if (order.status !== "pending") {
    return NextResponse.json({ ok: true, alreadyConfirmed: true });
  }

  if (order.confirm_code !== String(otp)) {
    return NextResponse.json({ error: "Codice non corretto" }, { status: 422 });
  }

  const { error: updateError } = await supabaseAdmin
    .from("orders")
    .update({ status: "new", confirm_code: null })
    .eq("id", id)
    .eq("business_id", business.id);

  if (updateError) {
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, clientName: order.client_name });
}
