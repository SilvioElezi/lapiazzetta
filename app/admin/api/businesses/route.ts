import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("businesses")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const { data, error } = await supabaseAdmin
    .from("businesses")
    .insert({
      slug:                   body.slug,
      name:                   body.name,
      phone:                  body.phone ?? null,
      wa_phone:               body.wa_phone ?? null,
      address:                body.address ?? null,
      lat:                    body.lat ?? null,
      lng:                    body.lng ?? null,
      radius_km:              body.radius_km ?? 5,
      logo_url:               body.logo_url ?? null,
      subscription_expires_at: body.subscription_expires_at ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
