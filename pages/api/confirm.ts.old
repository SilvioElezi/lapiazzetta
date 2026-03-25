import { supabase } from "@/lib/supabase";

export default async function handler(req, res) {
  const { token } = req.query;

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("confirm_token", token)
    .single();

  if (!order) return res.status(404).send("Invalid token");

  if (order.status !== "pending")
    return res.status(400).send("Already confirmed");

  if (new Date(order.token_expires_at) < new Date())
    return res.status(400).send("Expired");

  await supabase
    .from("orders")
    .update({
      status: "confirmed",
      confirmed_at: new Date()
    })
    .eq("id", order.id);

  res.send("Order confirmed. You can close this page.");
}
