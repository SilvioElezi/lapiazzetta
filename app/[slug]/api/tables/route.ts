import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { data: business } = await supabaseAdmin
    .from("businesses").select("id").eq("slug", slug).single();
  if (!business) return NextResponse.json([], { status: 404 });

  const { data } = await supabaseAdmin
    .from("tables")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: true });

  return NextResponse.json(data ?? []);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { data: business } = await supabaseAdmin
    .from("businesses").select("id").eq("slug", slug).single();
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Nome richiesto" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("tables")
    .insert({ business_id: business.id, name: name.trim() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
