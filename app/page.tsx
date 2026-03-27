import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "8bit.al — Piattaforma ordini online per pizzerie e ristoranti",
  description:
    "Sistema di ordinazione online multi-tenant con conferma via SMS, dashboard staff in tempo reale e notifiche Telegram. Tutto incluso, nessun costo di setup.",
};

export default function LandingPage() {
  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'DM Sans',sans-serif;background:#0D0D0D;color:#E8E4DC}
        a{color:inherit;text-decoration:none}
        img{display:block;max-width:100%}

        /* ── NAV ── */
        .nav{position:sticky;top:0;z-index:50;background:rgba(13,13,13,.85);backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,.06)}
        .nav__inner{max-width:1100px;margin:0 auto;padding:0 24px;height:58px;display:flex;align-items:center;justify-content:space-between}
        .nav__logo{font-family:Georgia,serif;font-size:1.15rem;font-weight:700;letter-spacing:-.01em;color:#fff}
        .nav__logo span{color:#E8A838}
        .nav__cta{padding:8px 18px;background:#E8A838;color:#0D0D0D;border:none;border-radius:8px;font-size:.82rem;font-weight:600;cursor:pointer;transition:background .15s}
        .nav__cta:hover{background:#F0B94A}

        /* ── HERO ── */
        .hero{padding:100px 24px 80px;text-align:center;max-width:820px;margin:0 auto}
        .hero__badge{display:inline-flex;align-items:center;gap:6px;padding:5px 14px;background:rgba(232,168,56,.12);border:1px solid rgba(232,168,56,.25);border-radius:999px;font-size:.75rem;font-weight:500;color:#E8A838;margin-bottom:28px;letter-spacing:.04em;text-transform:uppercase}
        .hero__title{font-family:Georgia,serif;font-size:clamp(2.2rem,6vw,3.8rem);font-weight:700;line-height:1.1;color:#fff;margin-bottom:22px}
        .hero__title span{color:#E8A838;font-style:italic}
        .hero__sub{font-size:clamp(1rem,2vw,1.18rem);color:#9A9590;line-height:1.7;max-width:600px;margin:0 auto 40px}
        .hero__actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
        .btn-primary{padding:14px 28px;background:#E8A838;color:#0D0D0D;border:none;border-radius:10px;font-size:.95rem;font-weight:600;cursor:pointer;transition:background .15s,transform .15s;font-family:inherit}
        .btn-primary:hover{background:#F0B94A;transform:translateY(-2px)}
        .btn-ghost{padding:14px 28px;background:transparent;color:#E8E4DC;border:1px solid rgba(255,255,255,.15);border-radius:10px;font-size:.95rem;font-weight:500;cursor:pointer;transition:background .15s;font-family:inherit}
        .btn-ghost:hover{background:rgba(255,255,255,.06)}

        /* ── DEMO STRIP ── */
        .demo-strip{background:rgba(255,255,255,.03);border-top:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06);padding:16px 24px;overflow:hidden}
        .demo-strip__inner{max-width:1100px;margin:0 auto;display:flex;gap:32px;align-items:center;justify-content:center;flex-wrap:wrap}
        .demo-strip__item{display:flex;align-items:center;gap:8px;font-size:.82rem;color:#6B6760;white-space:nowrap}
        .demo-strip__item span{color:#E8A838;font-size:1rem}

        /* ── FEATURES ── */
        .section{padding:80px 24px;max-width:1100px;margin:0 auto}
        .section__label{font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:#E8A838;margin-bottom:12px}
        .section__title{font-family:Georgia,serif;font-size:clamp(1.6rem,3.5vw,2.4rem);font-weight:700;color:#fff;line-height:1.2;margin-bottom:14px}
        .section__sub{font-size:1rem;color:#9A9590;line-height:1.7;max-width:560px}
        .features-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;margin-top:48px}
        .feat-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:24px;transition:border-color .2s,background .2s}
        .feat-card:hover{border-color:rgba(232,168,56,.25);background:rgba(232,168,56,.04)}
        .feat-card__icon{font-size:1.6rem;margin-bottom:14px}
        .feat-card__title{font-family:Georgia,serif;font-size:1rem;font-weight:700;color:#fff;margin-bottom:8px}
        .feat-card__body{font-size:.86rem;color:#7A7670;line-height:1.6}

        /* ── HOW IT WORKS ── */
        .how{padding:80px 24px;background:rgba(255,255,255,.02);border-top:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06)}
        .how__inner{max-width:900px;margin:0 auto}
        .steps{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:24px;margin-top:48px;position:relative}
        .step{display:flex;flex-direction:column;align-items:flex-start;gap:12px}
        .step__num{width:36px;height:36px;border-radius:50%;background:rgba(232,168,56,.15);border:1px solid rgba(232,168,56,.3);display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700;color:#E8A838;flex-shrink:0}
        .step__title{font-family:Georgia,serif;font-size:.98rem;font-weight:700;color:#fff}
        .step__body{font-size:.83rem;color:#7A7670;line-height:1.6}

        /* ── TENANTS ── */
        .tenants{padding:80px 24px;max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center}
        @media(max-width:720px){.tenants{grid-template-columns:1fr}}
        .tenants__visual{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:20px;padding:28px;display:flex;flex-direction:column;gap:12px}
        .tenant-row{display:flex;align-items:center;gap:12px;padding:10px 14px;background:rgba(255,255,255,.04);border-radius:10px;border:1px solid rgba(255,255,255,.06)}
        .tenant-row__dot{width:8px;height:8px;border-radius:50%;background:#4CAF50;flex-shrink:0}
        .tenant-row__name{font-size:.88rem;font-weight:500;color:#E8E4DC}
        .tenant-row__slug{font-size:.75rem;color:#6B6760;margin-left:auto}

        /* ── PRICING ── */
        .pricing{padding:80px 24px;background:rgba(255,255,255,.02);border-top:1px solid rgba(255,255,255,.06)}
        .pricing__inner{max-width:480px;margin:0 auto;text-align:center}
        .price-card{background:rgba(232,168,56,.07);border:1px solid rgba(232,168,56,.2);border-radius:20px;padding:40px 32px;margin-top:40px}
        .price-card__amount{font-family:Georgia,serif;font-size:3rem;font-weight:700;color:#E8A838;line-height:1}
        .price-card__period{font-size:.9rem;color:#7A7670;margin-top:4px;margin-bottom:24px}
        .price-card__features{list-style:none;display:flex;flex-direction:column;gap:10px;text-align:left;margin-bottom:28px}
        .price-card__features li{display:flex;align-items:center;gap:10px;font-size:.88rem;color:#C8C4BC}
        .price-card__features li::before{content:"✓";color:#E8A838;font-weight:700;flex-shrink:0}
        .price-card__note{font-size:.75rem;color:#6B6760;margin-top:14px;line-height:1.5}

        /* ── CTA ── */
        .cta-section{padding:100px 24px;text-align:center;max-width:700px;margin:0 auto}
        .cta-section__title{font-family:Georgia,serif;font-size:clamp(1.8rem,4vw,2.8rem);font-weight:700;color:#fff;margin-bottom:16px;line-height:1.2}
        .cta-section__sub{font-size:1rem;color:#9A9590;margin-bottom:36px;line-height:1.7}
        .cta-section__contact{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;align-items:center}
        .cta-link{display:flex;align-items:center;gap:8px;padding:14px 24px;border-radius:10px;font-size:.9rem;font-weight:500;transition:background .15s;border:1px solid rgba(255,255,255,.12);color:#E8E4DC}
        .cta-link:hover{background:rgba(255,255,255,.06)}
        .cta-link--wa{background:rgba(37,211,102,.1);border-color:rgba(37,211,102,.25);color:#25D366}
        .cta-link--wa:hover{background:rgba(37,211,102,.16)}

        /* ── FOOTER ── */
        .footer{border-top:1px solid rgba(255,255,255,.06);padding:32px 24px}
        .footer__inner{max-width:1100px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
        .footer__logo{font-family:Georgia,serif;font-size:.95rem;color:#4A4740}
        .footer__logo span{color:#E8A838}
        .footer__copy{font-size:.75rem;color:#4A4740}
      `}</style>

      {/* ── NAV ── */}
      <nav className="nav">
        <div className="nav__inner">
          <span className="nav__logo"><span>8</span>bit.al</span>
          <a href="https://wa.me/393520190999" className="nav__cta">Contattaci →</a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(232,168,56,.12), transparent)" }}>
        <div className="hero">
          <div className="hero__badge">
            <span>🍕</span> Piattaforma ordini per ristoranti
          </div>
          <h1 className="hero__title">
            Il tuo ristorante online,<br /><span>pronto in 24 ore</span>
          </h1>
          <p className="hero__sub">
            Sistema di ordinazione completo con conferma via SMS, dashboard staff in tempo reale
            e notifiche Telegram. Nessun costo di setup, nessuna commissione sugli ordini.
          </p>
          <div className="hero__actions">
            <a href="https://wa.me/393520190999" className="btn-primary">Inizia ora →</a>
            <a href="https://lapiaggetta.8bit.al" target="_blank" rel="noopener noreferrer" className="btn-ghost">Vedi demo live</a>
          </div>
        </div>
      </section>

      {/* ── STRIP ── */}
      <div className="demo-strip">
        <div className="demo-strip__inner">
          {[
            ["📦", "Nessuna commissione"],
            ["⚡", "Setup in 24 ore"],
            ["🔒", "Conferma via SMS"],
            ["📊", "Dashboard real-time"],
            ["🛵", "Gestione consegne"],
            ["📍", "Raggio di consegna GPS"],
          ].map(([icon, label]) => (
            <div key={label} className="demo-strip__item">
              <span>{icon}</span> {label}
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <div className="section">
        <p className="section__label">Funzionalità</p>
        <h2 className="section__title">Tutto quello che serve,<br />già incluso</h2>
        <p className="section__sub">
          Zero abbonamenti a terze parti. Zero commissioni per ordine. Una tariffa mensile fissa, tutto compreso.
        </p>
        <div className="features-grid">
          {[
            ["🛒", "Ordini online 24/7", "I clienti sfogliano il menu, aggiungono al carrello e ordinano direttamente dal tuo sito senza app da scaricare."],
            ["💬", "Conferma via SMS", "Ogni ordine viene confermato con un codice OTP a 4 cifre inviato via SMS — niente ordini fantasma."],
            ["📋", "Dashboard staff", "Pannello in tempo reale per reception, cucina e fattorini. Ogni ruolo vede solo ciò che gli serve."],
            ["🔔", "Notifiche Telegram", "Quando un ordine è pronto per la consegna, il fattorino riceve un messaggio Telegram automatico."],
            ["📍", "Raggio di consegna", "Il sistema calcola la distanza GPS del cliente e rifiuta automaticamente gli ordini fuori zona."],
            ["⚙️", "Pannello admin", "Gestisci menu, orari, costo di consegna e ordini online direttamente dal browser, senza tecnici."],
            ["🌐", "Multi-locale", "La stessa piattaforma può gestire più ristoranti ognuno con il proprio URL, menu e staff separati."],
            ["📱", "Mobile first", "Interfaccia ottimizzata per smartphone, sia per i clienti che per lo staff in cucina."],
          ].map(([icon, title, body]) => (
            <div key={title as string} className="feat-card">
              <div className="feat-card__icon">{icon}</div>
              <h3 className="feat-card__title">{title}</h3>
              <p className="feat-card__body">{body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div className="how">
        <div className="how__inner">
          <p className="section__label">Come funziona</p>
          <h2 className="section__title">Dall&apos;ordine alla consegna,<br />tutto automatico</h2>
          <div className="steps">
            {[
              ["1", "Cliente ordina", "Sfoglia il menu sul tuo sito e aggiunge i prodotti al carrello."],
              ["2", "Conferma SMS", "Riceve un codice a 4 cifre via SMS e lo inserisce per confermare."],
              ["3", "Notifica staff", "L'ordine appare istantaneamente nella dashboard dello staff."],
              ["4", "Pronto & consegnato", "La reception segna l'ordine pronto, il fattorino riceve la notifica."],
            ].map(([num, title, body]) => (
              <div key={num as string} className="step">
                <div className="step__num">{num}</div>
                <h3 className="step__title">{title}</h3>
                <p className="step__body">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MULTI-TENANT ── */}
      <div className="tenants">
        <div>
          <p className="section__label">Multi-locale</p>
          <h2 className="section__title">Un&apos;unica piattaforma,<br />tanti ristoranti</h2>
          <p className="section__sub" style={{ marginTop: 14 }}>
            Ogni ristorante ha il suo URL personalizzato, menu, staff e impostazioni completamente separati.
            Aggiungi un nuovo locale in pochi minuti.
          </p>
        </div>
        <div className="tenants__visual">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <p style={{ fontSize: ".72rem", color: "#6B6760", textTransform: "uppercase", letterSpacing: ".08em" }}>Locali attivi</p>
            <p style={{ fontSize: ".7rem", color: "#4A4740" }}>🔒 riservati</p>
          </div>
          {[
            ["Ristorante A", "••••••••••"],
            ["Pizzeria B", "••••••••••"],
            ["Trattoria C", "••••••••••"],
            ["Locale D", "••••••••••"],
          ].map(([name, slug]) => (
            <div key={slug} className="tenant-row">
              <div className="tenant-row__dot" />
              <span className="tenant-row__name">{name}</span>
              <span className="tenant-row__slug">/{slug}</span>
            </div>
          ))}
          <div style={{ marginTop: 4, padding: "8px 14px", border: "1px dashed rgba(232,168,56,.3)", borderRadius: 10, fontSize: ".82rem", color: "#E8A838", textAlign: "center" }}>
            + Aggiungi il tuo ristorante
          </div>
        </div>
      </div>

      {/* ── PRICING ── */}
      <div className="pricing">
        <div className="pricing__inner">
          <p className="section__label">Prezzi</p>
          <h2 className="section__title">Semplice e trasparente</h2>
          <div className="price-card">
            <div className="price-card__amount">€29</div>
            <div className="price-card__period">al mese · tutto incluso</div>
            <ul className="price-card__features">
              {[
                "Sito di ordinazione personalizzato",
                "Conferma ordini via SMS",
                "Dashboard staff illimitata",
                "Notifiche Telegram",
                "Pannello admin per menu e impostazioni",
                "Supporto tecnico incluso",
                "Nessuna commissione sugli ordini",
                "Setup e configurazione gratuiti",
              ].map((f) => <li key={f}>{f}</li>)}
            </ul>
            <a href="https://wa.me/393520190999" className="btn-primary" style={{ display: "block", textAlign: "center" }}>
              Inizia ora →
            </a>
            <p className="price-card__note">
              Primo mese gratuito. Nessun contratto a lungo termine — disdici quando vuoi.
            </p>
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <section className="cta-section">
        <h2 className="cta-section__title">Pronto a portare il tuo ristorante online?</h2>
        <p className="cta-section__sub">
          Contattaci oggi — configuriamo tutto noi, tu pensi solo al cibo.
        </p>
        <div className="cta-section__contact">
          <a href="https://wa.me/393520190999" className="cta-link cta-link--wa">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.554 4.112 1.522 5.836L0 24l6.336-1.501A11.958 11.958 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.8 9.8 0 01-5.032-1.388l-.36-.214-3.732.884.921-3.619-.235-.373A9.79 9.79 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z"/></svg>
            WhatsApp
          </a>
          <a href="mailto:info@8bit.al" className="cta-link">
            ✉️ info@8bit.al
          </a>
          <a href="https://8bit.al" target="_blank" rel="noopener noreferrer" className="cta-link">
            🌐 8bit.al
          </a>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="footer__inner">
          <span className="footer__logo"><span>8</span>bit.al</span>
          <span className="footer__copy">© {new Date().getFullYear()} 8bit.al · Tutti i diritti riservati</span>
        </div>
      </footer>
    </>
  );
}
