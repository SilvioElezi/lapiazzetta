import { NextRequest, NextResponse } from "next/server";
import { orders } from "../../../../lib/store";

async function sendTelegramDelivered(id: string, clientName: string, phone: string, placedAt: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_LOG_CHAT_ID;
  if (!token || !chatId) return;
  const mins = Math.round((Date.now() - new Date(placedAt).getTime()) / 60000);
  const text = `✅ *Ordine #${id} consegnato*\n👤 ${clientName} — 📞 ${phone}\n⏱ Consegnato in ${mins} min`;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  }).catch(() => {});
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const order = orders.get(id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  order.status = "ready";
  orders.set(id, order);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const order = orders.get(id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await sendTelegramDelivered(order.id, order.clientName, order.phone, order.placedAt);
  orders.delete(id);
  return NextResponse.json({ ok: true });
}
