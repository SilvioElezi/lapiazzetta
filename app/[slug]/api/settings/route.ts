import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id, subscription_expires_at")
    .eq("slug", slug)
    .single();

  if (!business) return NextResponse.json({}, { status: 404 });

  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("key, value")
    .eq("business_id", business.id);

  if (error) return NextResponse.json({}, { status: 500 });

  const result: Record<string, unknown> = {
    subscription_expires_at: business.subscription_expires_at ?? null,
  };
  for (const row of data) {
    result[row.key] = row.value;
  }
  return NextResponse.json(result);
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

  const { key, value } = await req.json();

  const { error } = await supabaseAdmin
    .from("settings")
    .upsert({ business_id: business.id, key, value }, { onConflict: "business_id,key" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
