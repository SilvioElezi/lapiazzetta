import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const supabase = supabaseAdmin; // ✅ lazy init

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("placed_at", { ascending: true });

  if (error) {
    return NextResponse.json([], { status: 500 });
  }

  return NextResponse.json(data);
}
