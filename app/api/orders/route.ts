import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";

export async function GET() {
  // Cleanup stale pending orders (older than 15 min) on every poll
  await supabaseAdmin
    .from("orders")
    .delete()
    .eq("status", "pending")
    .lt("placed_at", new Date(Date.now() - 15 * 60 * 1000).toISOString());

  // Return only active orders (new + ready) — never show pending to shop
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .in("status", ["new", "ready"])
    .order("placed_at", { ascending: true });

  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json(data);
}
