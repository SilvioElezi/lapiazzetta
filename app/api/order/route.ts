import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { Order } from "@/lib/types";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6).toUpperCase();
}

// ✅ CREATE WHATSAPP LINK
function buildWhatsAppLink(order: Order) {
  const phone = "393520190999"; // 🔴 PUT YOUR BUSINESS NUMBER HERE (no +, no spaces)

  const lines = order.items.map(
    (i) => `• ${i.name} x${i.qty}`
  ).join("%0A");

  const message = encodeURIComponent(
    `Ciao, confermo il mio ordine #%ID%\n\n${lines}\n\nTotale: €${order.total.toFixed(2)}`
      .replace("%ID%", order.id)
  );

  return `https://wa.me/${phone}?text=${message}`;
}

async function sendTelegramLog(order: Order) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_LOG_CHAT_ID;
  if (!token || !chatId) return;

  const lines = order.items.map(
    (i) => `  • ${i.name} x${i.qty} — €${(i.price * i.qty).toFixed(2)}`
  );

  const text = [
    `🍕 *Nuovo ordine #${order.id}*`,
    `👤 ${order.client_name} — 📞 ${order.phone}`,
    `📍 ${order.address}`,
    ``,
    lines.join("\n"),
    ``,
    `💰 *Totale: €${order.total.toFixed(2)}*`,
  ].join("\n");

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  }).catch(() => {});
}

export async function POST(req: NextRequest) {
  const supabase = supabaseAdmin;

  const body = await req.json();

  const order: Order = {
    id: generateId(),
    client_name: body.clientName,
    phone: body.phone,
    address: body.address,
    lat: body.lat,
    lng: body.lng,
    items: body.items,
    total: body.total,
    status: "new",
    placed_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("orders").insert(order);

  if (error) {
    console.error("Supabase insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await sendTelegramLog(order);

  // ✅ GENERATE WHATSAPP LINK
  const whatsappLink = buildWhatsAppLink(order);

  // ✅ RETURN IT
  return NextResponse.json({
    ok: true,
    id: order.id,
    whatsappLink
  });
}
