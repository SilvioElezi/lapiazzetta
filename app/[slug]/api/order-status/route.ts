import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!business) return NextResponse.json({ status: "not_found" });

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("status")
    .eq("id", id)
    .eq("business_id", business.id)
    .single();

  if (error || !data) return NextResponse.json({ status: "not_found" });
  return NextResponse.json({ status: data.status });
}
