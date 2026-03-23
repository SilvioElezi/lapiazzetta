"use client";
import { useEffect, useRef } from "react";

export default function Hero() {
  const headlineRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // Staggered entrance animation
    const el = headlineRef.current;
    if (!el) return;
    const words = el.querySelectorAll<HTMLElement>(".word");
    words.forEach((w, i) => {
      w.style.animationDelay = `${i * 120}ms`;
    });
  }, []);

  const scrollToMenu = () => {
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header className="hero">
      {/* Decorative background elements */}
      <div className="hero__bg" aria-hidden="true">
        <div className="hero__bg-circle hero__bg-circle--1" />
        <div className="hero__bg-circle hero__bg-circle--2" />
        <div className="hero__bg-stripe" />
      </div>

      <div className="hero__inner container">
        {/* Eyebrow */}
        <p className="hero__eyebrow">
          <span className="hero__eyebrow-dot" />
          Pizzeria · Consegna a domicilio
        </p>

        {/* Main headline */}
        <h1 className="hero__title" ref={headlineRef}>
          {"La Piazzetta".split(" ").map((word, i) => (
            <span key={i} className="word" style={{ display: "inline-block" }}>
              {i === 1 ? <em>{word}</em> : word}
              {i < 1 ? "\u00A0" : ""}
            </span>
          ))}
        </h1>

        {/* Tagline */}
        <p className="hero__tagline">
          Impasto a lunga lievitazione · Ingredienti freschi ogni giorno
          <br />
          <strong>Fatti a mano, consegnati con amore.</strong>
        </p>

        {/* CTA group */}
        <div className="hero__actions">
          <button className="btn btn--primary" onClick={scrollToMenu}>
            Ordina ora
          </button>
          <a className="btn btn--ghost" href="#contatti">
            Chiamaci
          </a>
        </div>

        {/* Info pills */}
        <div className="hero__pills">
          <span className="pill">🕐 Lun–Dom 18:00–23:00</span>
          <span className="pill">🛵 Consegna da €1,50</span>
          <span className="pill">⏱ Pronto in 30 min</span>
        </div>
      </div>

      {/* Bottom decorative divider */}
      <div className="hero__divider" aria-hidden="true">
        <svg viewBox="0 0 1440 48" preserveAspectRatio="none">
          <path d="M0,48 C360,0 1080,0 1440,48 L1440,48 L0,48 Z" fill="var(--color-cream)" />
        </svg>
      </div>

      <style>{`
        /* ── Hero shell ── */
        .hero {
          position: relative;
          background-color: var(--color-charcoal);
          color: var(--color-cream);
          padding: 96px 0 80px;
          overflow: hidden;
          min-height: 520px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        /* ── Decorative background ── */
        .hero__bg { position: absolute; inset: 0; pointer-events: none; }

        .hero__bg-circle {
          position: absolute;
          border-radius: 50%;
          background: var(--color-tomato);
          opacity: 0.12;
        }
        .hero__bg-circle--1 {
          width: 520px; height: 520px;
          top: -180px; right: -120px;
        }
        .hero__bg-circle--2 {
          width: 300px; height: 300px;
          bottom: -100px; left: -80px;
          background: var(--color-gold);
          opacity: 0.08;
        }
        .hero__bg-stripe {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 40px,
            rgba(255,255,255,0.015) 40px,
            rgba(255,255,255,0.015) 41px
          );
        }

        /* ── Inner layout ── */
        .hero__inner {
          position: relative;
          z-index: 1;
          max-width: 760px;
        }

        /* ── Eyebrow ── */
        .hero__eyebrow {
          font-family: var(--font-body);
          font-size: 0.78rem;
          font-weight: 500;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--color-gold-light);
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
          opacity: 0;
          animation: fadeUp 0.5s ease forwards;
          animation-delay: 0ms;
        }
        .hero__eyebrow-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--color-tomato-light);
          flex-shrink: 0;
        }

        /* ── Headline ── */
        .hero__title {
          font-family: var(--font-display);
          font-size: clamp(3.2rem, 8vw, 5.6rem);
          font-weight: 700;
          line-height: 1.02;
          color: var(--color-cream);
          margin-bottom: 24px;
          overflow: hidden;
        }
        .hero__title .word {
          opacity: 0;
          animation: fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .hero__title em {
          font-style: italic;
          color: var(--color-gold-light);
        }

        /* ── Tagline ── */
        .hero__tagline {
          font-size: 1rem;
          line-height: 1.7;
          color: rgba(253, 246, 236, 0.70);
          margin-bottom: 36px;
          max-width: 480px;
          opacity: 0;
          animation: fadeUp 0.5s ease forwards;
          animation-delay: 360ms;
        }
        .hero__tagline strong {
          color: var(--color-cream);
          font-weight: 500;
        }

        /* ── Actions ── */
        .hero__actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 32px;
          opacity: 0;
          animation: fadeUp 0.5s ease forwards;
          animation-delay: 460ms;
        }

        /* ── Buttons ── */
        .btn {
          font-family: var(--font-body);
          font-size: 0.95rem;
          font-weight: 500;
          padding: 14px 28px;
          border-radius: var(--radius-pill);
          border: none;
          cursor: pointer;
          transition: transform var(--transition-fast), box-shadow var(--transition-fast);
          white-space: nowrap;
        }
        .btn:hover  { transform: translateY(-2px); }
        .btn:active { transform: translateY(0); }

        .btn--primary {
          background: var(--color-tomato);
          color: #fff;
          box-shadow: var(--shadow-button);
        }
        .btn--primary:hover {
          background: var(--color-tomato-light);
          box-shadow: 0 6px 20px rgba(176, 58, 46, 0.40);
        }

        .btn--ghost {
          background: transparent;
          color: var(--color-cream);
          border: 1.5px solid rgba(253,246,236,0.30);
        }
        .btn--ghost:hover {
          background: rgba(253,246,236,0.08);
          border-color: rgba(253,246,236,0.55);
        }

        /* ── Pills ── */
        .hero__pills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          opacity: 0;
          animation: fadeUp 0.5s ease forwards;
          animation-delay: 560ms;
        }
        .pill {
          font-size: 0.78rem;
          font-weight: 400;
          padding: 6px 14px;
          border-radius: var(--radius-pill);
          background: rgba(253,246,236,0.08);
          border: 1px solid rgba(253,246,236,0.15);
          color: rgba(253,246,236,0.75);
          letter-spacing: 0.01em;
        }

        /* ── Curve divider ── */
        .hero__divider {
          position: absolute;
          bottom: -1px; left: 0; right: 0;
          line-height: 0;
        }
        .hero__divider svg { width: 100%; height: 48px; }

        /* ── Animation keyframes ── */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0);    }
        }

        /* ── Responsive ── */
        @media (max-width: 640px) {
          .hero { padding: 72px 0 64px; min-height: auto; }
          .hero__actions { flex-direction: column; }
          .btn { width: 100%; text-align: center; }
        }
      `}</style>
    </header>
  );
}
