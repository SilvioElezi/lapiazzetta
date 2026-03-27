import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const { data, error } = await supabaseAdmin
    .from("businesses")
    .update({
      name:                   body.name,
      phone:                  body.phone ?? null,
      address:                body.address ?? null,
      lat:                    body.lat ?? null,
      lng:                    body.lng ?? null,
      radius_km:              body.radius_km ?? 5,
      logo_url:               body.logo_url ?? null,
      subscription_expires_at: body.subscription_expires_at ?? null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
