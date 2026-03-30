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

  if (!token) {
    return (
      <div style={centered}>
        <p style={{ fontSize: "4rem" }}>🔗</p>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700 }}>Scansiona il QR code del tuo tavolo</h1>
        <p style={{ fontSize: "1rem", color: "#7A7770" }}>Chiedi al personale il QR code per ordinare dal tuo tavolo.</p>
      </div>
    );
  }

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

  const { data: table } = await supabaseAdmin
    .from("tables")
    .select("id, name, token")
    .eq("token", token)
    .eq("business_id", business.id)
    .eq("active", true)
    .maybeSingle();

  if (!table) {
    return (
      <div style={centered}>
        <p style={{ fontSize: "3rem" }}>❌</p>
        <h1 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Tavolo non valido o disattivato</h1>
        <p style={{ fontSize: ".9rem", color: "#7A7770" }}>Contatta il personale per assistenza.</p>
      </div>
    );
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
      tableName={table.name}
      tableToken={table.token}
      businessName={business.name}
      logoUrl={business.logo_url ?? null}
      menu={menu}
    />
  );
}
