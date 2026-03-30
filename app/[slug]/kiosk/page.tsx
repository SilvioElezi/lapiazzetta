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

  const { data: menuRows } = await supabaseAdmin
    .from("menu")
    .select("*")
    .eq("business_id", business.id)
    .order("sort_order");

  const menu = (menuRows ?? []).map((row) => ({
    ...row,
    items: ((row.items as { active?: boolean; show_kiosk?: boolean }[]) ?? []).filter(
      (i) => i.active !== false && i.show_kiosk !== false
    ),
  }));

  return (
    <KioskView
      slug={slug}
      tableName={tableName}
      tableToken={tableToken}
      businessName={business.name}
      logoUrl={business.logo_url ?? null}
      menu={menu}
    />
  );
}
