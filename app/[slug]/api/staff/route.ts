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
    .select("id, name, role, username")
    .eq("business_id", business.id);

  if (role) query = query.eq("role", role);

  const { data } = await query.order("name");
  return NextResponse.json(data ?? []);
}
