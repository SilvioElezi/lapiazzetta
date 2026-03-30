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
    return NextResponse.json({ error: `Business not found: ${bizErr?.message}`, articles: [], categories: [], sections: [] }, { status: 404 });
  }

  const bid = business.id;

  // ── Fetch sections config from settings ───────────────────────────────────
  const { data: sectionRow } = await supabaseAdmin
    .from("settings")
    .select("value")
    .eq("business_id", bid)
    .eq("key", "sections")
    .single();

  const sectionsConfig: { name: string; emoji: string }[] = (sectionRow?.value as { name: string; emoji: string }[]) ?? [
    { name: "Bar",      emoji: "🍹" },
    { name: "Pizzeria", emoji: "🍕" },
  ];

  // ── BarPRO articles ───────────────────────────────────────────────────────
  let barpro: { id: string; code: string; name: string; price: number; category: string; vat_rate: number; source: string; section: string }[] = [];
  let artErr: string | null = null;
  let vatErr: string | null = null;

  try {
    const [{ data: rawArticles, error: aErr }, { data: vatRates, error: vErr }] = await Promise.all([
      supabaseAdmin
        .from("articles")
        .select("id, code, name, price, category, vat_rate_id, active, show_cassa")
        .eq("business_id", bid)
        .eq("show_cassa", true)
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
      .filter((a: any) => a.active !== false && a.show_cassa !== false)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((a: any) => ({
        id:       String(a.id),
        code:     String(a.code),
        name:     String(a.name),
        price:    Number(a.price) || 0,
        category: `bp_${a.category ?? "0"}`,
        vat_rate: vatMap[Number(a.vat_rate_id)] ?? 10,
        source:   "barpro",
        section:  "Bar",
      }));
  } catch (e) {
    artErr = String(e);
  }

  // ── Menu items (pizza / food) ─────────────────────────────────────────────
  let menuItems: typeof barpro = [];
  let menuErr: string | null = null;
  // Maps category key (e.g. "menu_Pizza") → main_category name (e.g. "Pizzeria")
  const menuCatSection: Record<string, string> = {};

  try {
    // Try with main_category; if column doesn't exist yet, fall back gracefully
    type MenuCatRow = { category: string; items: unknown; main_category?: string | null };
    let menuCats: MenuCatRow[] = [];
    const r1 = await supabaseAdmin
      .from("menu")
      .select("category, items, main_category")
      .eq("business_id", bid)
      .order("sort_order", { ascending: true });

    if (r1.error) {
      // Likely column doesn't exist yet — retry without it
      const r2 = await supabaseAdmin
        .from("menu")
        .select("category, items")
        .eq("business_id", bid)
        .order("sort_order", { ascending: true });
      menuCats = (r2.data ?? []) as MenuCatRow[];
      menuErr = r2.error?.message ?? null;
    } else {
      menuCats = (r1.data ?? []) as MenuCatRow[];
    }

    for (const cat of menuCats) {
      const section = (cat.main_category as string | null) ?? sectionsConfig.find(s => s.name !== "Bar")?.name ?? "Pizzeria";
      menuCatSection[`menu_${cat.category}`] = section;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const item of (cat.items as any[]) || []) {
        if (item.active === false) continue;
        if (item.show_cassa === false) continue;
        menuItems.push({
          id:       `menu_${item.id}`,
          code:     `menu_${item.id}`,
          name:     String(item.name),
          price:    Number(item.price) || 0,
          category: `menu_${cat.category}`,
          vat_rate: 10,
          source:   "menu",
          section,
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

  // Build sections with their categories list
  const sectionCatMap: Record<string, string[]> = {};
  for (const s of sectionsConfig) sectionCatMap[s.name] = [];

  // Bar section = all bp_ categories
  for (const cat of categories.filter(c => c.startsWith("bp_"))) {
    if (!sectionCatMap["Bar"]) sectionCatMap["Bar"] = [];
    sectionCatMap["Bar"].push(cat);
  }
  // Other sections = menu_ categories by their main_category
  for (const [catKey, sectionName] of Object.entries(menuCatSection)) {
    if (!sectionCatMap[sectionName]) sectionCatMap[sectionName] = [];
    if (categories.includes(catKey)) sectionCatMap[sectionName].push(catKey);
  }

  const sections = sectionsConfig.map(s => ({
    name:       s.name,
    emoji:      s.emoji,
    categories: sectionCatMap[s.name] ?? [],
  }));

  return NextResponse.json({
    articles,
    categories,
    sections,
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
