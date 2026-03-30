import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

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

  const { data: raw, error } = await supabaseAdmin
    .from("articles")
    .select("id, code, name, price, category, vat_rates(rate)")
    .eq("business_id", business.id)
    .eq("active", true)
    .order("category", { nullsFirst: false })
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Flatten the vat_rates join
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const articles = (raw || []).map((a: any) => ({
    id:        a.id,
    code:      a.code,
    name:      a.name,
    price:     a.price,
    category:  a.category ?? "0",
    vat_rate:  a.vat_rates?.rate ?? 10,
  }));

  return NextResponse.json({ articles });
}
