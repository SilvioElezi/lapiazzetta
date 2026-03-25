import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .order("placed_at", { ascending: true });
  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json(data);
}
