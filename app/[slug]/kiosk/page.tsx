import { supabaseAdmin } from "@/lib/supabase-admin";
import KioskView from "@/components/KioskView";

export default async function KioskPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ table?: string }>;
}) {
  const { slug } = await params;
  const { table: token } = await searchParams;

  const centered: React.CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#1C1C1A",
    color: "#FDF6EC",
    fontFamily: "Georgia,serif",
    textAlign: "center",
    padding: 40,
    gap: 16,
  };

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id, slug, name, logo_url")
    .eq("slug", slug)
    .single();

  if (!business) {
    return (
      <div style={centered}>
        <p style={{ fontSize: "3rem" }}>❌</p>
        <h1 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Locale non trovato</h1>
      </div>
    );
  }

  // Look up table only if a token was provided
  let tableName: string | null = null;
  let tableToken: string | null = null;

  if (token) {
    const { data: table } = await supabaseAdmin
      .from("tables")
      .select("id, name, token")
      .eq("token", token)
      .eq("business_id", business.id)
      .eq("active", true)
      .maybeSingle();

    if (table) {
      tableName  = table.name;
      tableToken = table.token;
    }
  }

  // Fetch articles visible on kiosk
  const [{ data: artRows }, { data: menuCats }] = await Promise.all([
    supabaseAdmin
      .from("articles")
      .select("id, name, description, price, image_url, category_label, options, active")
      .eq("business_id", business.id)
      .eq("show_kiosk", true)
      .eq("active", true)
      .order("category_label")
      .order("sort_order")
      .order("name"),
    supabaseAdmin
      .from("menu")
      .select("category, emoji, sort_order")
      .eq("business_id", business.id)
      .order("sort_order"),
  ]);

  const emojiMap: Record<string, string> = {};
  for (const c of menuCats ?? []) emojiMap[c.category] = c.emoji;

  // Group by category_label
  const catMap: Record<string, { category: string; emoji: string; sort_order: number; items: unknown[] }> = {};
  for (const a of artRows ?? []) {
    const cat = (a.category_label as string) ?? "Altro";
    if (!catMap[cat]) {
      const sortOrder = menuCats?.find(c => c.category === cat)?.sort_order ?? 99;
      catMap[cat] = { category: cat, emoji: emojiMap[cat] ?? "📦", sort_order: sortOrder, items: [] };
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
    });
  }

  const menu = Object.values(catMap).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <KioskView
      slug={slug}
      tableName={tableName}
      tableToken={tableToken}
      businessName={business.name}
      logoUrl={business.logo_url ?? null}
      menu={menu as Parameters<typeof KioskView>[0]["menu"]}
    />
  );
}
