import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("menu")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const categories = await req.json();

  for (const cat of categories) {
    if (cat.id) {
      await supabase.from("menu").update({
        category: cat.category,
        emoji: cat.emoji,
        sort_order: cat.sort_order,
        items: cat.items,
      }).eq("id", cat.id);
    } else {
      await supabase.from("menu").insert({
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
  const supabase = getSupabaseAdmin();
  const { id } = await req.json();

  const { error } = await supabase
    .from("menu")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
