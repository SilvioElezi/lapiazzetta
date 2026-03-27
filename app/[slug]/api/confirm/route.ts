import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const token = req.nextUrl.searchParams.get("token");
  const id    = req.nextUrl.searchParams.get("id");

  if (!token || !id) {
    return new NextResponse(html("Errore", "Link non valido.", false), {
      headers: { "Content-Type": "text/html" },
    });
  }

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id, name")
    .eq("slug", slug)
    .single();

  if (!business) {
    return new NextResponse(html("Errore", "Attività non trovata.", false), {
      headers: { "Content-Type": "text/html" },
    });
  }

  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("id, status, confirm_code, client_name")
    .eq("id", id)
    .eq("business_id", business.id)
    .single();

  if (error || !order) {
    return new NextResponse(
      html("Ordine non trovato", "Il link non è più valido o l'ordine è scaduto.", false),
      { headers: { "Content-Type": "text/html" } }
    );
  }

  if (order.status !== "pending") {
    return new NextResponse(
      html("Già confermato", `Ciao ${order.client_name}! Il tuo ordine è già stato confermato ed è in preparazione. 🍕`, true),
      { headers: { "Content-Type": "text/html" } }
    );
  }

  if (order.confirm_code !== token) {
    return new NextResponse(
      html("Codice non valido", "Il token di conferma non corrisponde. Riprova.", false),
      { headers: { "Content-Type": "text/html" } }
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from("orders")
    .update({ status: "new", confirm_code: null })
    .eq("id", id)
    .eq("business_id", business.id);

  if (updateError) {
    return new NextResponse(
      html("Errore", "Si è verificato un errore. Riprova o chiamaci.", false),
      { headers: { "Content-Type": "text/html" } }
    );
  }

  return new NextResponse(
    html(
      "Ordine confermato! 🍕",
      `Ciao ${order.client_name}! Il tuo ordine è confermato ed è in preparazione. Puoi chiudere questa pagina.`,
      true,
      business.name
    ),
    { headers: { "Content-Type": "text/html" } }
  );
}

function html(title: string, message: string, success: boolean, brandName = "La Piazzetta"): string {
  const color = success ? "#4CAF50" : "#B03A2E";
  const icon  = success ? "✅" : "❌";
  const bg    = success ? "#F1F8F1" : "#FFF5F5";
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title} — ${brandName}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      background:${bg};min-height:100vh;display:flex;align-items:center;
      justify-content:center;padding:24px}
    .card{background:#fff;border-radius:20px;padding:40px 32px;max-width:400px;
      width:100%;text-align:center;box-shadow:0 8px 40px rgba(0,0,0,.1)}
    .icon{font-size:3rem;margin-bottom:16px}
    h1{font-size:1.4rem;font-weight:700;color:#1C1C1A;margin-bottom:12px}
    p{font-size:.95rem;color:#7A7770;line-height:1.6}
    .brand{margin-top:28px;font-size:.8rem;color:#B0ACA5}
    .brand strong{color:${color}}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <p class="brand">🍕 <strong>${brandName}</strong></p>
  </div>
</body>
</html>`;
}
