import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

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

  if (!business) return NextResponse.json([], { status: 404 });

  let query = supabaseAdmin
    .from("orders")
    .select("*")
    .eq("business_id", business.id)
    .in("status", ["completed", "cancelled"])
    .order("completed_at", { ascending: false, nullsFirst: false });

  // Filter by staff (receptionist sees only own)
  const staffId = sp.get("staffId");
  if (staffId) {
    query = query.eq("completed_by", parseInt(staffId));
  }

  // Filter by status
  const status = sp.get("status");
  if (status === "completed" || status === "cancelled") {
    query = query.eq("status", status);
  }

  // Filter by order type
  const orderType = sp.get("orderType");
  if (orderType === "delivery" || orderType === "kiosk") {
    query = query.eq("order_type", orderType);
  }

  // Filter by date range
  const dateFrom = sp.get("dateFrom");
  const dateTo = sp.get("dateTo");
  if (dateFrom) {
    query = query.gte("placed_at", `${dateFrom}T00:00:00`);
  }
  if (dateTo) {
    query = query.lte("placed_at", `${dateTo}T23:59:59`);
  }

  // Search by order ID or client name (sanitize to prevent filter injection)
  const search = sp.get("search");
  if (search) {
    const safe = search.replace(/[%_\\(),.*]/g, "");
    if (safe) {
      query = query.or(`id.ilike.%${safe}%,client_name.ilike.%${safe}%`);
    }
  }

  // Pagination
  const page = parseInt(sp.get("page") || "1");
  const limit = 50;
  const from = (page - 1) * limit;
  query = query.range(from, from + limit - 1);

  const { data, error } = await query;

  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json(data ?? []);
}
