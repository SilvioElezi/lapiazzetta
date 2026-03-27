import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; staffId: string }> }
) {
  const { id, staffId } = await params;
  const body = await req.json();

  const update: Record<string, string> = {};
  if (body.name?.trim())     update.name     = body.name.trim();
  if (body.username?.trim()) update.username = body.username.trim();
  if (body.password?.trim()) update.password = body.password.trim();
  if (body.role)             update.role     = body.role;

  const { data, error } = await supabaseAdmin
    .from("staff")
    .update(update)
    .eq("id", staffId)
    .eq("business_id", id)
    .select("id, username, role, name")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; staffId: string }> }
) {
  const { id, staffId } = await params;

  const { error } = await supabaseAdmin
    .from("staff")
    .delete()
    .eq("id", staffId)
    .eq("business_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
