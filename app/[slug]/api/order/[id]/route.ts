import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id, name, slug, phone, address, logo_url")
    .eq("slug", slug)
    .single();

  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", id)
    .eq("business_id", business.id)
    .single();

  if (error || !order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  return NextResponse.json({ order, business });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty body = mark ready */ }

  const action = body.action as string | undefined;

  // Cancel order (admin only — verified server-side)
  if (action === "cancel") {
    const staffId = body.staffId as number | undefined;

    if (!staffId) {
      return NextResponse.json({ error: "staffId richiesto" }, { status: 400 });
    }

    const { data: staff } = await supabaseAdmin
      .from("staff")
      .select("id, name, role")
      .eq("id", staffId)
      .single();

    if (!staff || staff.role !== "admin") {
      return NextResponse.json({ error: "Solo admin può annullare ordini" }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from("orders")
      .update({
        status: "cancelled",
        cancelled_by: staff.id,
        cancelled_by_name: staff.name,
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("business_id", business.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // Revert ready → new (admin only)
  if (action === "revert") {
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ status: "new" })
      .eq("id", id)
      .eq("business_id", business.id)
      .eq("status", "ready");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // Default: mark ready
  const { error } = await supabaseAdmin
    .from("orders")
    .update({ status: "ready" })
    .eq("id", id)
    .eq("business_id", business.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Mark order as completed (was DELETE — now soft-completes)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  // Read staff info from query params (sent by client)
  const staffId = req.nextUrl.searchParams.get("staffId");
  const staffName = req.nextUrl.searchParams.get("staffName");

  const { error } = await supabaseAdmin
    .from("orders")
    .update({
      status: "completed",
      completed_by: staffId ? parseInt(staffId) : null,
      completed_by_name: staffName || null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("business_id", business.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
