import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET — paginated invoice list with filters (for admin Fatture tab)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const sp = req.nextUrl.searchParams;

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!business) return NextResponse.json({ invoices: [] }, { status: 404 });

  const dateFrom = sp.get("dateFrom") ?? new Date().toISOString().split("T")[0];
  const dateTo   = sp.get("dateTo")   ?? dateFrom;
  const status   = sp.get("status");

  let query = supabaseAdmin
    .from("invoices")
    .select("id, invoice_number, invoice_date, status, total, payment_method, created_at, completed_at, table_id, employee_id, invoice_items(article_name, quantity, unit_price, total_price, line_order)")
    .eq("business_id", business.id)
    .gte("invoice_date", dateFrom)
    .lte("invoice_date", dateTo)
    .order("created_at", { ascending: false })
    .limit(200);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data: invoices, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ invoices: invoices ?? [] });
}
