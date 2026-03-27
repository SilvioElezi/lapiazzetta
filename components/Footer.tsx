import type { Business } from "../lib/types";

export default function Footer({ business }: { business?: Business }) {
  const displayName = business?.name ?? "La Piazzetta";
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      {/* ── Privacy Policy ── */}
      <div className="privacy" id="privacy">
        <div className="container">
          <h2 className="privacy__title">Informativa sulla Privacy</h2>
          <p className="privacy__sub">Ai sensi del Regolamento UE 2016/679 (GDPR)</p>

          <div className="privacy__grid">
            <div className="privacy__block">
              <h3>Titolare del trattamento</h3>
              <p>{displayName}{business?.address ? ` — ${business.address}` : ""}. Per esercitare i tuoi diritti o per qualsiasi informazione contattaci{business?.phone ? ` al ${business.phone}` : ""}.</p>
            </div>

            <div className="privacy__block">
              <h3>Dati raccolti</h3>
              <p>Raccogliamo esclusivamente i dati necessari all&apos;evasione dell&apos;ordine: <strong>nome e cognome</strong>, <strong>numero di telefono</strong> e <strong>indirizzo di consegna</strong>. Non raccogliamo cookie di profilazione né dati di navigazione.</p>
            </div>

            <div className="privacy__block">
              <h3>Finalità e base giuridica</h3>
              <p>I dati sono trattati esclusivamente per <strong>gestire e consegnare il tuo ordine</strong> (art. 6 par. 1 lett. b GDPR — esecuzione di un contratto). Non vengono utilizzati per finalità di marketing o profilazione commerciale.</p>
            </div>

            <div className="privacy__block">
              <h3>Conservazione</h3>
              <p>I dati dell&apos;ordine vengono conservati per il tempo strettamente necessario alla sua evasione e per adempiere agli obblighi di legge (fiscali e contabili). Non vengono venduti né ceduti a terzi.</p>
            </div>

            <div className="privacy__block">
              <h3>I tuoi diritti</h3>
              <p>Hai diritto di <strong>accesso, rettifica, cancellazione</strong> («diritto all&apos;oblio»), limitazione del trattamento e portabilità dei dati. Puoi esercitarli in qualsiasi momento contattandoci direttamente.</p>
            </div>

            <div className="privacy__block">
              <h3>Nessun trasferimento a terzi</h3>
              <p>I tuoi dati non vengono condivisi con terze parti per fini commerciali. Il servizio SMS di verifica OTP è utilizzato unicamente per confermare il tuo ordine.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="footer__inner">
          <div className="footer__brand">
            <span className="footer__logo">{displayName}</span>
            <p className="footer__tagline">Pizzeria artigianale · Consegna a domicilio</p>
          </div>
          <nav className="footer__links" aria-label="Footer navigation">
            <a href="#menu">Menu</a>
            <a href="#chi-siamo">Chi siamo</a>
            <a href="#contatti">Contatti</a>
            <a href="#privacy">Privacy</a>
          </nav>
          <p className="footer__copy">© {year} {displayName}. Tutti i diritti riservati.</p>
        </div>
      </div>

      <style>{`
        .privacy{background:#F5EADA;padding:56px 0 48px;border-top:1px solid #EDE0CC}
        .privacy__title{font-family:Georgia,serif;font-size:1.4rem;font-weight:700;color:#1C1C1A;margin-bottom:4px}
        .privacy__sub{font-size:.78rem;color:#7A7770;margin-bottom:32px;letter-spacing:.04em}
        .privacy__grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px}
        .privacy__block{background:#fff;border:1px solid #EDE0CC;border-radius:10px;padding:16px 18px}
        .privacy__block h3{font-size:.8rem;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#B03A2E;margin-bottom:8px}
        .privacy__block p{font-size:.8rem;color:#3A3A36;line-height:1.65}
        .privacy__block strong{color:#1C1C1A;font-weight:500}

        .footer {
          background: var(--color-charcoal);
          padding: 40px 0;
          border-top: 1px solid rgba(255,255,255,0.06);
        }

        .footer__inner {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .footer__logo {
          font-family: var(--font-display);
          font-size: 1.4rem;
          font-weight: 700;
          color: var(--color-cream);
          display: block;
          margin-bottom: 4px;
        }
        .footer__logo em {
          font-style: italic;
          color: var(--color-gold-light);
        }

        .footer__tagline {
          font-size: 0.75rem;
          color: rgba(253,246,236,0.45);
          letter-spacing: 0.04em;
        }

        .footer__links {
          display: flex;
          gap: 24px;
        }
        .footer__links a {
          font-size: 0.85rem;
          color: rgba(253,246,236,0.55);
          text-decoration: none;
          transition: color 0.2s;
        }
        .footer__links a:hover {
          color: var(--color-cream);
        }

        .footer__copy {
          font-size: 0.75rem;
          color: rgba(253,246,236,0.3);
        }

        @media (max-width: 640px) {
          .footer__inner { flex-direction: column; align-items: flex-start; }
          .footer__links { flex-wrap: wrap; gap: 16px; }
        }
      `}</style>
    </footer>
  );
}
