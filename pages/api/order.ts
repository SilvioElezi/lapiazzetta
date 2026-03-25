import { supabase } from "@/lib/supabase";
import { generateConfirmToken } from "@/lib/token";

export default async function handler(req, res) {
  const { phone, items, total } = req.body;

  const token = generateConfirmToken();

  await supabase.from("orders").insert({
    phone,
    items,
    total,
    status: "pending",
    confirm_token: token,
    token_expires_at: new Date(Date.now() + 10 * 60 * 1000)
  });

  const confirmUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/confirm?token=${token}`;

  const whatsappLink = `https://wa.me/${phone}?text=${encodeURIComponent(
`Order received ✔️

Confirm your order:
${confirmUrl}

If this wasn't you, ignore this message.`
  )}`;

  res.json({ whatsappLink });
}
