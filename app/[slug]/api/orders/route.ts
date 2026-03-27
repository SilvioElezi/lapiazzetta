import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!business) return NextResponse.json([], { status: 404 });

  // Cleanup stale pending orders for this business (older than 15 min)
  await supabaseAdmin
    .from("orders")
    .delete()
    .eq("business_id", business.id)
    .eq("status", "pending")
    .lt("placed_at", new Date(Date.now() - 15 * 60 * 1000).toISOString());

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("business_id", business.id)
    .in("status", ["new", "ready"])
    .order("placed_at", { ascending: true });

  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json(data);
}
