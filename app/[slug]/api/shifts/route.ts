import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const staffId = searchParams.get("staffId");
  const status  = searchParams.get("status");

  const { data: business } = await supabaseAdmin
    .from("businesses").select("id").eq("slug", slug).single();
  if (!business) return NextResponse.json([], { status: 404 });

  let query = supabaseAdmin
    .from("delivery_shifts")
    .select("*")
    .eq("business_id", business.id)
    .order("started_at", { ascending: false });

  if (staffId) query = query.eq("staff_id", staffId);
  if (status)  query = query.eq("status", status);

  const { data } = await query;
  return NextResponse.json(data ?? []);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { data: business } = await supabaseAdmin
    .from("businesses").select("id").eq("slug", slug).single();
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { staffId, staffName, initialFloat } = await req.json();
  if (!staffId || !staffName) return NextResponse.json({ error: "staffId e staffName richiesti" }, { status: 400 });

  // Only one active shift per staff at a time
  const { data: existing } = await supabaseAdmin
    .from("delivery_shifts")
    .select("id")
    .eq("business_id", business.id)
    .eq("staff_id", String(staffId))
    .eq("status", "active")
    .maybeSingle();

  if (existing) return NextResponse.json({ error: "Il fattorino ha già un turno attivo" }, { status: 409 });

  const { data, error } = await supabaseAdmin
    .from("delivery_shifts")
    .insert({
      business_id:   business.id,
      staff_id:      String(staffId),
      staff_name:    staffName,
      initial_float: parseFloat(initialFloat) || 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
