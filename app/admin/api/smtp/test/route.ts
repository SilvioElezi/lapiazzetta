import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const { to } = await req.json();

  if (!to || !to.includes("@")) {
    return NextResponse.json({ error: "Indirizzo email non valido" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("global_settings")
    .select("value")
    .eq("key", "smtp_config")
    .single();

  if (error || !data?.value) {
    return NextResponse.json({ error: "SMTP non configurato" }, { status: 400 });
  }

  const cfg = data.value;

  if (!cfg.host || !cfg.port) {
    return NextResponse.json({ error: "Host e porta SMTP obbligatori" }, { status: 400 });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.encryption === "ssl",
      auth: cfg.username ? { user: cfg.username, pass: cfg.password } : undefined,
      ...(cfg.encryption === "tls" ? { requireTLS: true } : {}),
    });

    await transporter.verify();

    await transporter.sendMail({
      from: cfg.from_name
        ? `"${cfg.from_name}" <${cfg.from_email}>`
        : cfg.from_email,
      to,
      subject: "Test SMTP — La Piazzetta",
      text: "Se ricevi questa email, la configurazione SMTP funziona correttamente!",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#FDF6EC;border-radius:16px;">
          <h2 style="color:#B03A2E;margin:0 0 12px;">Test SMTP riuscito!</h2>
          <p style="color:#3A3A36;line-height:1.6;">
            Se ricevi questa email, la configurazione SMTP di <strong>La Piazzetta</strong> funziona correttamente.
          </p>
          <p style="color:#7A7770;font-size:13px;margin-top:20px;">
            Questo messaggio e stato inviato automaticamente dal pannello Super Admin.
          </p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
