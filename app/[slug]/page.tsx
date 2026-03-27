import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabaseAdmin } from "../../lib/supabase-admin";
import Hero from "../../components/Hero";
import MenuGrid from "../../components/MenuGrid";
import About from "../../components/About";
import InfoSection from "../../components/InfoSection";
import Footer from "../../components/Footer";
import CheckoutDrawer from "../../components/CheckoutDrawer";
import type { Business } from "../../lib/types";

type Props = { params: Promise<{ slug: string }> };

async function getBusiness(slug: string): Promise<Business | null> {
  const { data } = await supabaseAdmin
    .from("businesses")
    .select("id, slug, name, logo_url, phone, wa_phone, address, lat, lng, radius_km")
    .eq("slug", slug)
    .single();
  return data ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const business = await getBusiness(slug);
  if (!business) return { title: "Not Found" };
  return {
    title: `${business.name} — Pizzeria & Consegna a domicilio`,
    description: `Ordina online da ${business.name}. Pizza artigianale, consegna a domicilio.`,
  };
}

export default async function SlugPage({ params }: Props) {
  const { slug } = await params;
  const business = await getBusiness(slug);
  if (!business) notFound();

  return (
    <main>
      <Hero business={business} />
      <MenuGrid slug={slug} />
      <About />
      <InfoSection business={business} />
      <Footer business={business} />
      <CheckoutDrawer business={business} />
    </main>
  );
}
