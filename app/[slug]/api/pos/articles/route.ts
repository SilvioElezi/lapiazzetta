import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

// GET ?admin=1  → all articles, no visibility filter (for admin product management)
// GET (default) → show_cassa=true + active=true (for POS Cassa)
// GET ?context=kiosk   → show_kiosk=true + active=true
// GET ?context=online  → show_online=true + active=true
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const sp      = new URL(req.url).searchParams;
  const isAdmin = sp.get("admin") === "1";
  const context = sp.get("context"); // "kiosk" | "online" | null

  const { data: business, error: bizErr } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .single();

  if (bizErr || !business) {
    return NextResponse.json({ error: "Business not found", articles: [], categories: [], sections: [] }, { status: 404 });
  }

  const bid = business.id;

  // Sections config
  const { data: sectionRow } = await supabaseAdmin
    .from("settings")
    .select("value")
    .eq("business_id", bid)
    .eq("key", "sections")
    .single();

  const sectionsConfig: { name: string; emoji: string }[] =
    (sectionRow?.value as { name: string; emoji: string }[]) ??
    [{ name: "Bar", emoji: "🍹" }, { name: "Pizzeria", emoji: "🍕" }];

  // VAT rates
  const { data: vatRates } = await supabaseAdmin.from("vat_rates").select("id, rate").eq("business_id", bid);
  const vatMap: Record<number, number> = {};
  for (const v of vatRates ?? []) vatMap[v.id] = Number(v.rate);

  // Build query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabaseAdmin
    .from("articles")
    .select("id, code, name, description, price, category_label, section_name, vat_rate_id, active, show_cassa, show_kiosk, show_online, image_url, options, sort_order")
    .eq("business_id", bid)
    .order("category_label", { nullsFirst: false })
    .order("sort_order")
    .order("name");

  if (!isAdmin) {
    if (context === "kiosk")  { query = query.eq("show_kiosk",  true).eq("active", true); }
    else if (context === "online") { query = query.eq("show_online", true).eq("active", true); }
    else { query = query.eq("show_cassa", true).eq("active", true); }
  }

  const { data: raw, error: artErr } = await query;

  // Frequency: count how many times each article was ordered in the last 30 days
  const freqMap: Record<string, number> = {};
  if (!isAdmin) {
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { data: invIds } = await supabaseAdmin
      .from("invoices").select("id").eq("business_id", bid).gte("created_at", since);
    if (invIds && invIds.length > 0) {
      const ids = invIds.map((i: { id: string }) => i.id);
      const { data: freqRows } = await supabaseAdmin
        .from("invoice_items").select("article_id").in("invoice_id", ids);
      for (const row of freqRows ?? []) {
        if (row.article_id) freqMap[row.article_id] = (freqMap[row.article_id] || 0) + 1;
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const articles = (raw ?? []).map((a: any) => ({
    id:          String(a.id),
    code:        String(a.code ?? ""),
    name:        String(a.name),
    description: String(a.description ?? ""),
    price:       Number(a.price) || 0,
    category:    String(a.category_label ?? "Varie"),
    vat_rate:    vatMap[Number(a.vat_rate_id)] ?? 10,
    section:     String(a.section_name ?? "Bar"),
    image_url:   String(a.image_url ?? ""),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options:     (a.options ?? {}) as any,
    active:      a.active !== false,
    show_cassa:  a.show_cassa !== false,
    show_kiosk:  a.show_kiosk === true,
    show_online: a.show_online === true,
    order_count: freqMap[String(a.id)] ?? 0,
  }));

  const categories = [...new Set(articles.map((a: { category: string }) => a.category))];

  const sectionCatMap: Record<string, string[]> = {};
  for (const s of sectionsConfig) sectionCatMap[s.name] = [];
  for (const a of articles) {
    const sec = a.section;
    if (!sectionCatMap[sec]) sectionCatMap[sec] = [];
    if (!sectionCatMap[sec].includes(a.category)) sectionCatMap[sec].push(a.category);
  }

  const sections = sectionsConfig.map(s => ({
    name:       s.name,
    emoji:      s.emoji,
    categories: sectionCatMap[s.name] ?? [],
  }));

  return NextResponse.json(
    { articles, categories, sections, debug: { business_id: bid, total: articles.length, art_error: artErr?.message ?? null } },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}

// POST — create a new article
export async function POST(
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

  const {
    name, description, price, category_label, section_name,
    image_url, options, vat_rate_id,
    show_cassa = true, show_kiosk = false, show_online = false,
  } = await req.json();

  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const code = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const category = "custom_" + (category_label ?? "other").toLowerCase().replace(/[^a-z0-9]/g, "_");

  const { data, error } = await supabaseAdmin
    .from("articles")
    .insert({
      business_id:    business.id,
      code,
      name:           name.trim(),
      description:    description ?? null,
      price:          price ?? 0,
      category,
      category_label: category_label ?? null,
      section_name:   section_name ?? null,
      image_url:      image_url || null,
      options:        options ?? {},
      vat_rate_id:    vat_rate_id ?? null,
      show_cassa,
      show_kiosk,
      show_online,
      active:         true,
      sort_order:     0,
      created_by:     "admin",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}
