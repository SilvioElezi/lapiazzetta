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

  // Separate queries to avoid FK join cache issues with newly created tables
  const [{ data: raw, error }, { data: vatRates }] = await Promise.all([
    supabaseAdmin
      .from("articles")
      .select("id, code, name, price, category, vat_rate_id")
      .eq("business_id", business.id)
      .eq("active", true)
      .order("category", { nullsFirst: false })
      .order("name"),
    supabaseAdmin
      .from("vat_rates")
      .select("id, rate")
      .eq("business_id", business.id),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const vatMap: Record<number, number> = {};
  for (const v of vatRates || []) vatMap[v.id] = v.rate;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const articles = (raw || []).map((a: any) => ({
    id:       a.id,
    code:     a.code,
    name:     a.name,
    price:    Number(a.price),
    category: a.category ?? "0",
    vat_rate: vatMap[a.vat_rate_id] ?? 10,
  }));

  // Distinct sorted categories for the sidebar
  const categories = [...new Set(articles.map(a => a.category))].sort(
    (x, y) => Number(x) - Number(y)
  );

  return NextResponse.json({ articles, categories });
}
