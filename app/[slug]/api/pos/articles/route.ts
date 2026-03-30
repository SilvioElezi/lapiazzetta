import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { data: business, error: bizErr } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .single();

  if (bizErr || !business) {
    return NextResponse.json({ error: `Business not found: ${bizErr?.message}`, articles: [], categories: [] }, { status: 404 });
  }

  const bid = business.id;

  // ── BarPRO articles (no active filter — get all) ──────────────────────────
  let barpro: { id: string; code: string; name: string; price: number; category: string; vat_rate: number; source: string }[] = [];
  let artErr: string | null = null;
  let vatErr: string | null = null;

  try {
    const [{ data: rawArticles, error: aErr }, { data: vatRates, error: vErr }] = await Promise.all([
      supabaseAdmin
        .from("articles")
        .select("id, code, name, price, category, vat_rate_id, active")
        .eq("business_id", bid)
        .order("category", { nullsFirst: false })
        .order("name"),
      supabaseAdmin
        .from("vat_rates")
        .select("id, rate")
        .eq("business_id", bid),
    ]);

    artErr = aErr?.message ?? null;
    vatErr = vErr?.message ?? null;

    const vatMap: Record<number, number> = {};
    for (const v of vatRates || []) vatMap[v.id] = v.rate;

    barpro = (rawArticles || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((a: any) => a.active !== false)
      .map((a: any) => ({
        id:       String(a.id),
        code:     String(a.code),
        name:     String(a.name),
        price:    Number(a.price) || 0,
        category: `bp_${a.category ?? "0"}`,
        vat_rate: vatMap[Number(a.vat_rate_id)] ?? 10,
        source:   "barpro",
      }));
  } catch (e) {
    artErr = String(e);
  }

  // ── Menu items (pizza / food) ─────────────────────────────────────────────
  let menuItems: typeof barpro = [];
  let menuErr: string | null = null;

  try {
    const { data: menuCats, error: mErr } = await supabaseAdmin
      .from("menu")
      .select("category, items")
      .eq("business_id", bid)
      .order("sort_order", { ascending: true });

    menuErr = mErr?.message ?? null;

    for (const cat of menuCats || []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const item of (cat.items as any[]) || []) {
        if (item.active === false) continue;
        menuItems.push({
          id:       `menu_${item.id}`,
          code:     `menu_${item.id}`,
          name:     String(item.name),
          price:    Number(item.price) || 0,
          category: `menu_${cat.category}`,
          vat_rate: 10,
          source:   "menu",
        });
      }
    }
  } catch (e) {
    menuErr = String(e);
  }

  const articles = [...barpro, ...menuItems];

  // Sorted categories: BarPRO first (numeric), then menu
  const categories = [...new Set(articles.map(a => a.category))].sort((x, y) => {
    const xb = x.startsWith("bp_"), yb = y.startsWith("bp_");
    if (xb && yb) return Number(x.slice(3)) - Number(y.slice(3));
    if (xb) return -1; if (yb) return 1;
    return x.localeCompare(y);
  });

  return NextResponse.json({
    articles,
    categories,
    debug: {
      business_id:   bid,
      barpro_count:  barpro.length,
      menu_count:    menuItems.length,
      art_error:     artErr,
      vat_error:     vatErr,
      menu_error:    menuErr,
    },
  }, {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}
