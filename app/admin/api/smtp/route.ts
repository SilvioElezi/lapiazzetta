import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const SMTP_KEY = "smtp_config";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("global_settings")
    .select("value")
    .eq("key", SMTP_KEY)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const config = data?.value ?? {
    host: "",
    port: 587,
    username: "",
    password: "",
    from_email: "",
    from_name: "",
    encryption: "tls",
    enabled: false,
  };

  // Never return the password to the client
  return NextResponse.json({ ...config, password: config.password ? "••••••••" : "" });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // If password is the masked placeholder, keep the existing one
  if (body.password === "••••••••") {
    const { data: existing } = await supabaseAdmin
      .from("global_settings")
      .select("value")
      .eq("key", SMTP_KEY)
      .single();

    if (existing?.value?.password) {
      body.password = existing.value.password;
    } else {
      body.password = "";
    }
  }

  const config = {
    host: body.host ?? "",
    port: Number(body.port) || 587,
    username: body.username ?? "",
    password: body.password ?? "",
    from_email: body.from_email ?? "",
    from_name: body.from_name ?? "",
    encryption: body.encryption ?? "tls",
    enabled: Boolean(body.enabled),
  };

  const { error } = await supabaseAdmin
    .from("global_settings")
    .upsert({ key: SMTP_KEY, value: config }, { onConflict: "key" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
