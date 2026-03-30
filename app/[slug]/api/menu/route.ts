import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET — serves two purposes:
//   default  → online public menu: articles with show_online=true, grouped by category
//   ?admin=1 → returns raw menu category rows (for admin category management)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const isAdmin  = new URL(req.url).searchParams.get("admin") === "1";

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!business) return NextResponse.json([], { status: 404 });

  // Admin mode: return raw category definitions (used by MenuTab for category management)
  if (isAdmin) {
    const { data, error } = await supabaseAdmin
      .from("menu")
      .select("*")
      .eq("business_id", business.id)
      .order("sort_order", { ascending: true });
    if (error) return NextResponse.json([], { status: 500 });
    return NextResponse.json(data);
  }

  // Public online menu: articles with show_online=true, grouped as MenuCategory[]
  const [{ data: artRows }, { data: menuCats }] = await Promise.all([
    supabaseAdmin
      .from("articles")
      .select("id, name, description, price, image_url, category_label, options, active")
      .eq("business_id", business.id)
      .eq("show_online", true)
      .eq("active", true)
      .order("category_label")
      .order("sort_order")
      .order("name"),
    supabaseAdmin
      .from("menu")
      .select("category, emoji, sort_order, main_category")
      .eq("business_id", business.id)
      .order("sort_order"),
  ]);

  const emojiMap: Record<string, string> = {};
  for (const c of menuCats ?? []) emojiMap[c.category] = c.emoji;

  // Group articles by category_label
  const catMap: Record<string, { category: string; emoji: string; sort_order: number; items: unknown[] }> = {};
  for (const a of artRows ?? []) {
    const cat = (a.category_label as string) ?? "Altro";
    if (!catMap[cat]) {
      catMap[cat] = { category: cat, emoji: emojiMap[cat] ?? "📦", sort_order: menuCats?.find(c => c.category === cat)?.sort_order ?? 99, items: [] };
    }
    catMap[cat].items.push({
      id:          a.id,
      name:        a.name,
      ingredients: a.description ?? "",
      price:       Number(a.price),
      image_url:   a.image_url ?? "",
      active:      true,
      options:     a.options ?? {},
      popular:     false,
      spicy:       false,
      vegetarian:  false,
      show_online: true,
    });
  }

  const result = Object.values(catMap).sort((a, b) => a.sort_order - b.sort_order);
  return NextResponse.json(result);
}

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

  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const categories = await req.json();

  for (const cat of categories) {
    if (cat.id) {
      await supabaseAdmin
        .from("menu")
        .update({ category: cat.category, emoji: cat.emoji, sort_order: cat.sort_order, items: cat.items, main_category: cat.main_category ?? null })
        .eq("id", cat.id)
        .eq("business_id", business.id);
    } else {
      await supabaseAdmin
        .from("menu")
        .insert({ business_id: business.id, category: cat.category, emoji: cat.emoji, sort_order: cat.sort_order ?? 0, items: cat.items, main_category: cat.main_category ?? null });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
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

  const { id } = await req.json();

  const { error } = await supabaseAdmin
    .from("menu")
    .delete()
    .eq("id", id)
    .eq("business_id", business.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
