import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");

  const { data: business } = await supabaseAdmin
    .from("businesses").select("id").eq("slug", slug).single();
  if (!business) return NextResponse.json([], { status: 404 });

  let query = supabaseAdmin
    .from("staff")
    .select("id, name, role, username, active, display_role")
    .eq("business_id", business.id);

  if (role) query = query.eq("role", role);

  const { data } = await query.order("name");
  return NextResponse.json(data ?? []);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { data: business } = await supabaseAdmin
    .from("businesses").select("id").eq("slug", slug).single();
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const { name, username, password, role, display_role } = await req.json();
  if (!name?.trim() || !username?.trim() || !password?.trim() || !role)
    return NextResponse.json({ error: "Campi obbligatori mancanti" }, { status: 400 });

  // Check username uniqueness within business
  const { data: existing } = await supabaseAdmin
    .from("staff").select("id").eq("business_id", business.id).eq("username", username.trim()).maybeSingle();
  if (existing) return NextResponse.json({ error: "Username già in uso" }, { status: 409 });

  const { data, error } = await supabaseAdmin
    .from("staff")
    .insert({ business_id: business.id, name: name.trim(), username: username.trim(), password, role, display_role: display_role?.trim() || null, active: true })
    .select("id, name, role, username, active, display_role")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { data: business } = await supabaseAdmin
    .from("businesses").select("id").eq("slug", slug).single();
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const { id, name, username, password, role, display_role, active } = await req.json();
  if (!id) return NextResponse.json({ error: "ID mancante" }, { status: 400 });

  // Check username uniqueness (excluding self)
  if (username) {
    const { data: existing } = await supabaseAdmin
      .from("staff").select("id").eq("business_id", business.id).eq("username", username.trim()).neq("id", id).maybeSingle();
    if (existing) return NextResponse.json({ error: "Username già in uso" }, { status: 409 });
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined)         updates.name         = name.trim();
  if (username !== undefined)     updates.username     = username.trim();
  if (password !== undefined && password !== "") updates.password = password;
  if (role !== undefined)         updates.role         = role;
  if (display_role !== undefined) updates.display_role = display_role?.trim() || null;
  if (active !== undefined)       updates.active       = active;

  const { data, error } = await supabaseAdmin
    .from("staff")
    .update(updates)
    .eq("id", id)
    .eq("business_id", business.id)
    .select("id, name, role, username, active, display_role")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { data: business } = await supabaseAdmin
    .from("businesses").select("id").eq("slug", slug).single();
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID mancante" }, { status: 400 });

  // Soft delete
  const { error } = await supabaseAdmin
    .from("staff")
    .update({ active: false })
    .eq("id", id)
    .eq("business_id", business.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
