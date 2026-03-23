export default function InfoSection() {
  const hours = [
    { day: "Lunedì",    open: false, time: null },
    { day: "Martedì",   open: true,  time: "18:00 – 23:00" },
    { day: "Mercoledì", open: true,  time: "18:00 – 23:00" },
    { day: "Giovedì",   open: true,  time: "18:00 – 23:00" },
    { day: "Venerdì",   open: true,  time: "18:00 – 23:30" },
    { day: "Sabato",    open: true,  time: "12:00 – 14:30 / 18:00 – 23:30" },
    { day: "Domenica",  open: true,  time: "12:00 – 14:30 / 18:00 – 23:00" },
  ];

  // Detect today to highlight current row
  const todayIndex = new Date().getDay(); // 0 = Sunday
  // Remap: our array starts Monday (index 0), Sunday = index 6
  const todayRow = todayIndex === 0 ? 6 : todayIndex - 1;

  return (
    <section className="info" id="contatti">
      <div className="container">

        <div className="info__grid">

          {/* ── Hours ── */}
          <div className="info__block">
            <p className="section-label">Orari</p>
            <h2 className="section-title">Quando <em>trovarci</em></h2>

            <div className="hours-table">
              {hours.map((row, i) => (
                <div
                  key={row.day}
                  className={`hours-row${!row.open ? " hours-row--closed" : ""}${i === todayRow ? " hours-row--today" : ""}`}
                >
                  <span className="hours-day">
                    {i === todayRow && <span className="today-dot" aria-label="Oggi" />}
                    {row.day}
                  </span>
                  <span className="hours-time">
                    {row.open ? row.time : <span className="closed-label">Chiuso</span>}
                  </span>
                </div>
              ))}
            </div>

            <p className="hours-note">
              * Orari soggetti a variazioni nei giorni festivi.
              Controlla i nostri social per aggiornamenti.
            </p>
          </div>

          {/* ── Contacts ── */}
          <div className="info__block">
            <p className="section-label">Contatti</p>
            <h2 className="section-title">Siamo <em>qui</em></h2>

            <div className="contacts">

              {/* Phone */}
              <a href="tel:+390308860239" className="contact-card">
                <div className="contact-icon contact-icon--phone">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                  </svg>
                </div>
                <div className="contact-info">
                  <span className="contact-label">Telefono</span>
                  <span className="contact-value">+39 030 886 0293</span>
                </div>
                <svg className="contact-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>

              {/* WhatsApp */}
              <a href="https://wa.me/390308860293" target="_blank" rel="noopener noreferrer" className="contact-card">
                <div className="contact-icon contact-icon--whatsapp">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
                <div className="contact-info">
                  <span className="contact-label">WhatsApp</span>
                  <span className="contact-value">Scrivici su WhatsApp</span>
                </div>
                <svg className="contact-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>

              {/* Address */}
              <a href="https://maps.app.goo.gl/Ufs9Xwda54Nwj44G6?g_st=ac" target="_blank" rel="noopener noreferrer" className="contact-card">
                <div className="contact-icon contact-icon--map">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div className="contact-info">
                  <span className="contact-label">Indirizzo</span>
                  <span className="contact-value">Via Esempio 1, Città</span>
                </div>
                <svg className="contact-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>

              {/* Instagram */}
              <a href="https://instagram.com/lapiazzetta" target="_blank" rel="noopener noreferrer" className="contact-card">
                <div className="contact-icon contact-icon--instagram">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                    <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                  </svg>
                </div>
                <div className="contact-info">
                  <span className="contact-label">Instagram</span>
                  <span className="contact-value">@lapiazzetta</span>
                </div>
                <svg className="contact-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>

            </div>

            {/* Delivery zone note */}
            <div className="delivery-note">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Consegna a domicilio nel raggio di <strong>5 km</strong>. Ritiro in pizzeria sempre disponibile.
            </div>
          </div>

        </div>
      </div>

      <style>{`
        .info {
          padding: 80px 0;
          background: var(--color-cream-dark, #F5EADA);
          border-top: 1px solid var(--color-parchment);
        }

        .info__grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 64px;
          align-items: flex-start;
        }

        .info__block {}

        /* ── Hours table ── */
        .hours-table {
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin-bottom: 16px;
        }

        .hours-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          border-radius: var(--radius-sm, 6px);
          transition: background 0.2s;
        }
        .hours-row:hover {
          background: rgba(28,28,26,0.04);
        }
        .hours-row--closed {
          opacity: 0.45;
        }
        .hours-row--today {
          background: var(--color-charcoal, #1C1C1A) !important;
        }
        .hours-row--today .hours-day,
        .hours-row--today .hours-time {
          color: var(--color-cream, #FDF6EC) !important;
        }

        .hours-day {
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--color-charcoal);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .today-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--color-gold-light, #E5B060);
          flex-shrink: 0;
        }

        .hours-time {
          font-size: 0.85rem;
          color: var(--color-stone);
          text-align: right;
        }

        .closed-label {
          color: var(--color-tomato);
          font-weight: 500;
          font-size: 0.8rem;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .hours-note {
          font-size: 0.75rem;
          color: var(--color-stone-light, #B0ACA5);
          line-height: 1.5;
          padding-left: 14px;
        }

        /* ── Contact cards ── */
        .contacts {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 20px;
        }

        .contact-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          background: var(--color-surface, #fff);
          border: 1px solid var(--color-parchment);
          border-radius: var(--radius-md, 12px);
          box-shadow: var(--shadow-card);
          cursor: pointer;
          text-decoration: none;
          transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
        }
        .contact-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-card-hover);
          border-color: var(--color-stone-light, #B0ACA5);
        }

        .contact-icon {
          width: 40px; height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .contact-icon--phone     { background: #FEF3DB; color: #8A5E12; }
        .contact-icon--whatsapp  { background: #EBF5EB; color: #25D366; }
        .contact-icon--map       { background: #FDECEA; color: var(--color-tomato); }
        .contact-icon--instagram { background: #FDE8F3; color: #C13584; }

        .contact-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .contact-label {
          font-size: 0.7rem;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--color-stone);
        }
        .contact-value {
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--color-charcoal);
        }

        .contact-arrow {
          color: var(--color-stone-light);
          flex-shrink: 0;
          transition: transform 0.2s, color 0.2s;
        }
        .contact-card:hover .contact-arrow {
          transform: translateX(3px);
          color: var(--color-charcoal);
        }

        /* ── Delivery note ── */
        .delivery-note {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 0.8rem;
          color: var(--color-stone);
          line-height: 1.5;
          padding: 12px 14px;
          background: rgba(176,58,46,0.06);
          border-radius: var(--radius-sm, 6px);
          border-left: 3px solid var(--color-tomato);
        }
        .delivery-note svg { flex-shrink: 0; margin-top: 1px; color: var(--color-tomato); }
        .delivery-note strong { color: var(--color-charcoal); }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .info__grid {
            grid-template-columns: 1fr;
            gap: 48px;
          }
        }
      `}</style>
    </section>
  );
}
