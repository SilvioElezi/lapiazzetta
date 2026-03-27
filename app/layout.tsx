import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "../components/CartContext";

export const metadata: Metadata = {
  title: "8bit.al — Piattaforma ordini online per ristoranti",
  description: "Sistema di ordinazione online con conferma SMS, dashboard staff in tempo reale e notifiche Telegram.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}