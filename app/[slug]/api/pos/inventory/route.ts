import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

// GET — all articles with stock levels
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: articles, error } = await supabaseAdmin
    .from("articles")
    .select("id, code, name, category_label, section_name, quantity_on_hand, active, price")
    .eq("business_id", business.id)
    .eq("active", true)
    .order("category_label", { nullsFirst: false })
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ articles: articles ?? [] });
}
