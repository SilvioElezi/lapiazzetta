import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("staff")
    .select("id, username, role, name")
    .eq("username", username.trim())
    .eq("password", password.trim())
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Credenziali errate" }, { status: 401 });
  }

  return NextResponse.json({ ok: true, user: data });
}
