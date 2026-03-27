import type { Business } from "../lib/types";

export default function Footer({ business }: { business?: Business }) {
  const displayName = business?.name ?? "La Piazzetta";
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
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
          </nav>
          <p className="footer__copy">© {year} {displayName}. Tutti i diritti riservati.</p>
        </div>
      </div>

      <style>{`
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
