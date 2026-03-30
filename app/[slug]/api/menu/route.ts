import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!business) return NextResponse.json([], { status: 404 });

  const { data, error } = await supabaseAdmin
    .from("menu")
    .select("*")
    .eq("business_id", business.id)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const categories = await req.json();

  for (const cat of categories) {
    if (cat.id) {
      await supabaseAdmin
        .from("menu")
        .update({ category: cat.category, emoji: cat.emoji, sort_order: cat.sort_order, items: cat.items, main_category: cat.main_category ?? null })
        .eq("id", cat.id)
        .eq("business_id", business.id);
    } else {
      await supabaseAdmin
        .from("menu")
        .insert({ business_id: business.id, category: cat.category, emoji: cat.emoji, sort_order: cat.sort_order ?? 0, items: cat.items, main_category: cat.main_category ?? null });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const { id } = await req.json();

  const { error } = await supabaseAdmin
    .from("menu")
    .delete()
    .eq("id", id)
    .eq("business_id", business.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
