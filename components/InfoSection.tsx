"use client";
import { useEffect, useState } from "react";
import type { Business } from "../lib/types";

type DayHours = { open: boolean; from: string; to: string };
type WeekHours = Record<string, DayHours>;

const DAY_LABELS: Record<string, string> = {
  monday: "Lunedì", tuesday: "Martedì", wednesday: "Mercoledì",
  thursday: "Giovedì", friday: "Venerdì", saturday: "Sabato", sunday: "Domenica"
};
const DAY_KEYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

const DEFAULT_HOURS: WeekHours = {
  monday:    { open: false, from: "18:00", to: "23:00" },
  tuesday:   { open: true,  from: "18:00", to: "23:00" },
  wednesday: { open: true,  from: "18:00", to: "23:00" },
  thursday:  { open: true,  from: "18:00", to: "23:00" },
  friday:    { open: true,  from: "18:00", to: "23:30" },
  saturday:  { open: true,  from: "12:00", to: "23:30" },
  sunday:    { open: true,  from: "12:00", to: "23:00" },
};

export default function InfoSection({ business }: { business?: Business }) {
  const [hours, setHours] = useState<WeekHours>(DEFAULT_HOURS);
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const slug = business?.slug;

  useEffect(() => {
    const url = slug ? `/${slug}/api/settings` : "/api/settings";
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.hours) setHours(data.hours);
        if (data.delivery_fee != null) setDeliveryFee(parseFloat(data.delivery_fee) || 0);
      })
      .catch(() => {});
  }, [slug]);

  const todayKey = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][new Date().getDay()];

  const mapsUrl = business?.lat && business?.lng
    ? `https://maps.google.com/?q=${business.lat},${business.lng}`
    : `https://maps.google.com/?q=${encodeURIComponent(business?.address ?? "")}`;

  return (
    <section className="info" id="contatti">
      <div className="container">
        <div className="info__grid">

          {/* Hours */}
          <div className="info__block">
            <p className="section-label">Orari</p>
            <h2 className="section-title">Quando <em>trovarci</em></h2>
            <div className="hours-table">
              {DAY_KEYS.map((day) => {
                const d = hours[day];
                const isToday = day === todayKey;
                return (
                  <div key={day} className={`hours-row${!d.open ? " hours-row--closed" : ""}${isToday ? " hours-row--today" : ""}`}>
                    <span className="hours-day">
                      {isToday && <span className="today-dot" />}
                      {DAY_LABELS[day]}
                    </span>
                    <span className="hours-time">
                      {d.open ? `${d.from} – ${d.to}` : <span className="closed-label">Chiuso</span>}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="hours-note">* Orari soggetti a variazioni nei giorni festivi.</p>
          </div>

          {/* Contacts */}
          <div className="info__block">
            <p className="section-label">Contatti</p>
            <h2 className="section-title">Siamo <em>qui</em></h2>
            <div className="contacts">
              <a href={`tel:${business?.phone ?? ""}`} className="contact-card">
                <div className="contact-icon contact-icon--phone">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                </div>
                <div className="contact-info"><span className="contact-label">Telefono</span><span className="contact-value">{business?.phone ?? "—"}</span></div>
                <svg className="contact-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </a>
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="contact-card">
                <div className="contact-icon contact-icon--map">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <div className="contact-info"><span className="contact-label">Indirizzo</span><span className="contact-value">{business?.address ?? "—"}</span></div>
                <svg className="contact-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </a>
            </div>
            <div className="delivery-note">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>
                Consegna a domicilio nel raggio di <strong>{business?.radius_km ?? 5} km</strong>
                {deliveryFee != null && deliveryFee > 0 && <> · Costo consegna <strong>€{deliveryFee.toFixed(2)}</strong></>}
                {deliveryFee === 0 && <> · Consegna <strong>gratuita</strong></>}
                . Ritiro in pizzeria sempre disponibile.
              </span>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        .info{padding:80px 0;background:var(--color-cream-dark,#F5EADA);border-top:1px solid var(--color-parchment,#EDE0CC)}
        .info__grid{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:flex-start}
        .section-label{font-size:.72rem;font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:var(--color-tomato,#B03A2E);margin-bottom:10px;display:block}
        .section-title{font-family:var(--font-display,Georgia,serif);font-size:clamp(1.7rem,3vw,2.3rem);color:var(--color-charcoal,#1C1C1A);margin-bottom:20px;line-height:1.15}
        .section-title em{font-style:italic;color:var(--color-tomato,#B03A2E)}
        .hours-table{display:flex;flex-direction:column;gap:2px;margin-bottom:14px}
        .hours-row{display:flex;justify-content:space-between;align-items:center;padding:9px 12px;border-radius:6px;transition:background .2s}
        .hours-row:hover{background:rgba(28,28,26,.04)}
        .hours-row--closed{opacity:.4}
        .hours-row--today{background:var(--color-charcoal,#1C1C1A)!important}
        .hours-row--today .hours-day,.hours-row--today .hours-time{color:var(--color-cream,#FDF6EC)!important}
        .hours-day{font-size:.88rem;font-weight:500;color:var(--color-charcoal,#1C1C1A);display:flex;align-items:center;gap:8px}
        .today-dot{width:6px;height:6px;border-radius:50%;background:var(--color-gold-light,#E5B060);flex-shrink:0}
        .hours-time{font-size:.82rem;color:var(--color-stone,#7A7770);text-align:right}
        .closed-label{color:var(--color-tomato,#B03A2E);font-weight:500;font-size:.76rem;letter-spacing:.04em;text-transform:uppercase}
        .hours-note{font-size:.72rem;color:var(--color-stone-light,#B0ACA5);line-height:1.5;padding-left:12px}
        .contacts{display:flex;flex-direction:column;gap:9px;margin-bottom:18px}
        .contact-card{display:flex;align-items:center;gap:13px;padding:13px 14px;background:var(--color-surface,#fff);border:1px solid var(--color-parchment,#EDE0CC);border-radius:12px;box-shadow:var(--shadow-card,0 2px 12px rgba(28,28,26,.08));text-decoration:none;transition:transform .2s,box-shadow .2s,border-color .2s}
        .contact-card:hover{transform:translateY(-2px);box-shadow:var(--shadow-card-hover,0 8px 32px rgba(28,28,26,.14));border-color:var(--color-stone-light,#B0ACA5)}
        .contact-icon{width:38px;height:38px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .contact-icon--phone{background:#FEF3DB;color:#8A5E12}
        .contact-icon--map{background:#FDECEA;color:var(--color-tomato,#B03A2E)}
        .contact-info{flex:1;display:flex;flex-direction:column;gap:1px}
        .contact-label{font-size:.68rem;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--color-stone,#7A7770)}
        .contact-value{font-size:.88rem;font-weight:500;color:var(--color-charcoal,#1C1C1A)}
        .contact-arrow{color:var(--color-stone-light,#B0ACA5);flex-shrink:0;transition:transform .2s,color .2s}
        .contact-card:hover .contact-arrow{transform:translateX(3px);color:var(--color-charcoal,#1C1C1A)}
        .delivery-note{display:flex;align-items:flex-start;gap:8px;font-size:.78rem;color:var(--color-stone,#7A7770);line-height:1.5;padding:11px 13px;background:rgba(176,58,46,.06);border-radius:6px;border-left:3px solid var(--color-tomato,#B03A2E)}
        .delivery-note svg{flex-shrink:0;margin-top:1px;color:var(--color-tomato,#B03A2E)}
        .delivery-note strong{color:var(--color-charcoal,#1C1C1A)}
        @media(max-width:768px){.info__grid{grid-template-columns:1fr;gap:48px}}
      `}</style>
    </section>
  );
}
