import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("key, value");

  if (error) return NextResponse.json({}, { status: 500 });

  const result: Record<string, any> = {};
  for (const row of data) {
    result[row.key] = row.value;
  }
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json(); // { key: string, value: any }
  const { key, value } = body;

  const { error } = await supabaseAdmin
    .from("settings")
    .upsert({ key, value }, { onConflict: "key" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
