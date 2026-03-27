import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from("staff")
    .select("id, username, role, name")
    .eq("business_id", id)
    .order("role", { ascending: true })
    .order("name", { ascending: true });

  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  if (!body.username?.trim() || !body.password?.trim() || !body.role) {
    return NextResponse.json({ error: "username, password e role sono obbligatori" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("staff")
    .insert({
      business_id: id,
      username: body.username.trim(),
      password: body.password.trim(),
      role: body.role,
      name: body.name?.trim() ?? body.username.trim(),
    })
    .select("id, username, role, name")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
