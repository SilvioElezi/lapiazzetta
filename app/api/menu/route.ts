import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("menu")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const categories = await req.json();
  // Upsert all categories
  for (const cat of categories) {
    if (cat.id) {
      await supabaseAdmin.from("menu").update({
        category: cat.category,
        emoji: cat.emoji,
        sort_order: cat.sort_order,
        items: cat.items,
      }).eq("id", cat.id);
    } else {
      await supabaseAdmin.from("menu").insert({
        category: cat.category,
        emoji: cat.emoji,
        sort_order: cat.sort_order ?? 0,
        items: cat.items,
      });
    }
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const { error } = await supabaseAdmin.from("menu").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
