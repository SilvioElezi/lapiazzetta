import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

async function sendTelegramDelivered(
  id: string,
  clientName: string,
  phone: string,
  placedAt: string
) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_LOG_CHAT_ID;
  if (!token || !chatId) return;

  const mins = Math.round(
    (Date.now() - new Date(placedAt).getTime()) / 60000
  );

  const text = `✅ *Ordine #${id} consegnato*\n👤 ${clientName} — 📞 ${phone}\n⏱ ${mins} min`;

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

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabaseAdmin(); // ✅ lazy init
  const { id } = await params;

  const { error } = await supabase
    .from("orders")
    .update({ status: "ready" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabaseAdmin(); // ✅ lazy init
  const { id } = await params;

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();

  if (order) {
    await sendTelegramDelivered(
      order.id,
      order.client_name,
      order.phone,
      order.placed_at
    );
  }

  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
