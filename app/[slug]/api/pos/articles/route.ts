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

  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  // ── 1. Fetch BarPRO articles + VAT rates ──────────────────────────────────
  const [{ data: rawArticles, error: artErr }, { data: vatRates }, { data: menuCats, error: menuErr }] =
    await Promise.all([
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
      supabaseAdmin
        .from("menu")
        .select("category, emoji, sort_order, items")
        .eq("business_id", business.id)
        .order("sort_order", { ascending: true }),
    ]);

  const vatMap: Record<number, number> = {};
  for (const v of vatRates || []) vatMap[v.id] = v.rate;

  // ── 2. BarPRO articles ────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const barpro = (rawArticles || []).map((a: any) => ({
    id:       String(a.id),
    code:     a.code,
    name:     a.name,
    price:    Number(a.price),
    category: `bp_${a.category ?? "0"}`,   // prefix: bp_1, bp_2 …
    vat_rate: vatMap[a.vat_rate_id] ?? 10,
    source:   "barpro" as const,
  }));

  // ── 3. Menu (pizza / food) items ──────────────────────────────────────────
  const menuItems: {
    id: string; code: string; name: string; price: number;
    category: string; vat_rate: number; source: "menu";
  }[] = [];

  for (const cat of menuCats || []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const item of (cat.items as any[]) || []) {
      if (item.active === false) continue;
      menuItems.push({
        id:       `menu_${item.id}`,
        code:     `menu_${item.id}`,
        name:     item.name,
        price:    Number(item.price),
        category: `menu_${cat.category}`,   // prefix: menu_Pizza, menu_Antipasti …
        vat_rate: 10,                        // food: IVA 10%
        source:   "menu",
      });
    }
  }

  const articles = [...barpro, ...menuItems];

  // ── 4. Categories list ────────────────────────────────────────────────────
  const categories = [...new Set(articles.map(a => a.category))];
  // BarPRO categories first (sorted numerically), then menu categories
  categories.sort((x, y) => {
    const xBP = x.startsWith("bp_"), yBP = y.startsWith("bp_");
    if (xBP && yBP) return Number(x.slice(3)) - Number(y.slice(3));
    if (xBP) return -1;
    if (yBP) return 1;
    return x.localeCompare(y);
  });

  // Debug info in case something went wrong
  const debug = {
    barpro_count: barpro.length,
    menu_count:   menuItems.length,
    art_error:    artErr?.message ?? null,
    menu_error:   menuErr?.message ?? null,
  };

  return NextResponse.json({ articles, categories, debug });
}
