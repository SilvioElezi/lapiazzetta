export default function About() {
  return (
    <section className="about" id="chi-siamo">
      <div className="container">
        <div className="about__grid">

          {/* Left — visual card stack */}
          <div className="about__visual" aria-hidden="true">
            <div className="about__card about__card--back">
              <span className="about__card-year">Est. 2008</span>
            </div>
            <div className="about__card about__card--front">
              <div className="about__icon">🍕</div>
              <p className="about__card-label">Impasto a lunga<br/>lievitazione 48h</p>
            </div>
            <div className="about__badge">
              <span>100%</span>
              <small>Artigianale</small>
            </div>
          </div>

          {/* Right — text */}
          <div className="about__text">
            <p className="section-label">Chi siamo</p>
            <h2 className="section-title">
              Una storia di <em>passione</em><br/>e farina
            </h2>
            <p className="about__body">
              La Piazzetta nasce nel cuore del quartiere nel 2017, dalla volontà
              di portare la vera pizza napoletana a domicilio senza compromessi.
              Ogni impasto riposa 48 ore, ogni pomodoro è selezionato, ogni
              fornitura arriva fresca ogni mattina.
            </p>
            <p className="about__body">
              Non siamo una catena. Siamo una famiglia — e la tua pizza la
              trattiamo come se la mangiassimo noi stessi.
            </p>

            {/* Stats row */}
            <div className="about__stats">
              <div className="stat">
                <span className="stat__num">15+</span>
                <span className="stat__lbl">Anni di attività</span>
              </div>
              <div className="stat__divider" />
              <div className="stat">
                <span className="stat__num">48h</span>
                <span className="stat__lbl">Lievitazione impasto</span>
              </div>
              <div className="stat__divider" />
              <div className="stat">
                <span className="stat__num">30'</span>
                <span className="stat__lbl">Consegna media</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        .about {
          padding: 80px 0;
          background: var(--color-cream);
        }

        .about__grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 64px;
          align-items: center;
        }

        /* ── Visual stack ── */
        .about__visual {
          position: relative;
          height: 340px;
        }

        .about__card {
          position: absolute;
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }

        .about__card--back {
          width: 240px; height: 280px;
          background: var(--color-tomato);
          top: 20px; left: 30px;
          transform: rotate(-4deg);
          opacity: 0.15;
        }

        .about__card--front {
          width: 240px; height: 280px;
          background: var(--color-surface, #fff);
          border: 1px solid var(--color-parchment);
          box-shadow: var(--shadow-card-hover);
          top: 0; left: 10px;
        }

        .about__card-year {
          font-family: var(--font-display);
          font-size: 2rem;
          font-weight: 700;
          color: #fff;
          letter-spacing: 0.02em;
        }

        .about__icon {
          font-size: 3rem;
          line-height: 1;
        }

        .about__card-label {
          font-family: var(--font-body);
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--color-stone);
          text-align: center;
          line-height: 1.4;
        }

        .about__badge {
          position: absolute;
          bottom: 30px; right: 20px;
          background: var(--color-charcoal);
          color: var(--color-cream);
          border-radius: var(--radius-md);
          padding: 14px 18px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          box-shadow: 0 4px 16px rgba(28,28,26,0.25);
        }
        .about__badge span {
          font-family: var(--font-display);
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-gold-light);
          line-height: 1;
        }
        .about__badge small {
          font-size: 0.68rem;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(253,246,236,0.6);
        }

        /* ── Text side ── */
        .section-label {
          font-size: 0.72rem;
          font-weight: 500;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--color-tomato);
          margin-bottom: 10px;
        }

        .section-title {
          font-family: var(--font-display);
          font-size: clamp(1.7rem, 3vw, 2.4rem);
          color: var(--color-charcoal);
          margin-bottom: 20px;
          line-height: 1.15;
        }
        .section-title em {
          font-style: italic;
          color: var(--color-tomato);
        }

        .about__body {
          font-size: 0.95rem;
          line-height: 1.75;
          color: var(--color-stone);
          margin-bottom: 14px;
        }

        /* ── Stats ── */
        .about__stats {
          display: flex;
          align-items: center;
          gap: 24px;
          margin-top: 32px;
          padding-top: 28px;
          border-top: 1px solid var(--color-parchment);
        }

        .stat {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .stat__num {
          font-family: var(--font-display);
          font-size: 1.8rem;
          font-weight: 700;
          color: var(--color-charcoal);
          line-height: 1;
        }
        .stat__lbl {
          font-size: 0.72rem;
          font-weight: 400;
          color: var(--color-stone);
          white-space: nowrap;
        }
        .stat__divider {
          width: 1px;
          height: 40px;
          background: var(--color-parchment);
          flex-shrink: 0;
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .about__grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          .about__visual {
            height: 260px;
          }
          .about__card--front,
          .about__card--back {
            width: 200px;
            height: 230px;
          }
        }
      `}</style>
    </section>
  );
}
