import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "../components/CartContext";

export const metadata: Metadata = {
  title: "La Piazzetta — Pizzeria & Consegna a domicilio",
  description: "Pizza artigianale, impasto 48h, consegna a domicilio.",
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