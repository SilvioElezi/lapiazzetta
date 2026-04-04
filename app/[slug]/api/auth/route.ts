import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { compareSync } from "bcryptjs";

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

  const { data: staffRow } = await supabaseAdmin
    .from("staff")
    .select("id, username, role, name, password")
    .eq("username", username.trim())
    .eq("business_id", business.id)
    .single();

  if (!staffRow || !compareSync(password.trim(), staffRow.password)) {
    return NextResponse.json({ error: "Credenziali errate" }, { status: 401 });
  }

  const data = { id: staffRow.id, username: staffRow.username, role: staffRow.role, name: staffRow.name };

  // For admin users, find all other businesses accessible with the same credentials
  let businesses: { id: string; slug: string; name: string }[] = [];
  if (data.role === "admin") {
    const { data: allStaff } = await supabaseAdmin
      .from("staff")
      .select("id, business_id, password, businesses(id, slug, name)")
      .eq("username", username.trim())
      .eq("role", "admin");

    if (allStaff) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      businesses = (allStaff as any[])
        .filter((s) => compareSync(password.trim(), s.password))
        .map((s) => s.businesses)
        .flat()
        .filter((b): b is { id: string; slug: string; name: string } => b != null);
    }
  }

  return NextResponse.json({ ok: true, user: data, businesses });
}
