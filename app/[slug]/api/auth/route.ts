import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("staff")
    .select("id, username, role, name")
    .eq("username", username.trim())
    .eq("password", password.trim())
    .eq("business_id", business.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Credenziali errate" }, { status: 401 });
  }

  return NextResponse.json({ ok: true, user: data });
}
