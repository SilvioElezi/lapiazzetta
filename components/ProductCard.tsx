import { MenuItem } from "../data/menu";
import { buildTelegramOrder } from "../utils/telegram";

type Props = {
  item: MenuItem;
};

export default function ProductCard({ item }: Props) {
  const orderText = `Ciao! Vorrei ordinare:\n- ${item.name} — €${item.price.toFixed(2)}`;

  return (
    <article className="card">
      {/* Badges row */}
      {(item.popular || item.spicy || item.vegetarian) && (
        <div className="card__badges">
          {item.popular    && <span className="badge badge--popular">⭐ Popolare</span>}
          {item.spicy      && <span className="badge badge--spicy">🌶 Piccante</span>}
          {item.vegetarian && <span className="badge badge--veg">🌿 Vegetariana</span>}
        </div>
      )}

      {/* Content */}
      <div className="card__body">
        <div className="card__header">
          <h3 className="card__name">{item.name}</h3>
          <span className="card__price">€{item.price.toFixed(2)}</span>
        </div>

        {item.description && (
          <p className="card__description">{item.description}</p>
        )}

        <p className="card__ingredients">{item.ingredients}</p>
      </div>

      {/* CTA */}
      <a
        href={buildTelegramOrder(orderText)}
        target="_blank"
        rel="noopener noreferrer"
        className="card__btn"
        aria-label={`Ordina ${item.name}`}
      >
        Ordina
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </a>

      <style>{`
        .card {
          background: var(--color-surface);
          border: 1px solid var(--color-parchment);
          border-radius: var(--radius-md);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          box-shadow: var(--shadow-card);
          transition: transform var(--transition-base), box-shadow var(--transition-base);
          position: relative;
        }
        .card:hover {
          transform: translateY(-3px);
          box-shadow: var(--shadow-card-hover);
        }

        /* ── Badges ── */
        .card__badges {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .badge {
          font-family: var(--font-body);
          font-size: 0.68rem;
          font-weight: 500;
          letter-spacing: 0.04em;
          padding: 3px 9px;
          border-radius: var(--radius-pill);
          white-space: nowrap;
        }
        .badge--popular {
          background: #FEF3DB;
          color: #8A5E12;
          border: 1px solid #F0D28A;
        }
        .badge--spicy {
          background: #FDECEA;
          color: #8C2318;
          border: 1px solid #F5B4AD;
        }
        .badge--veg {
          background: #EBF5EB;
          color: #245524;
          border: 1px solid #A8D4A8;
        }

        /* ── Body ── */
        .card__body { flex: 1; }

        .card__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 6px;
        }

        .card__name {
          font-family: var(--font-display);
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--color-charcoal);
          line-height: 1.25;
        }

        .card__price {
          font-family: var(--font-body);
          font-size: 1.05rem;
          font-weight: 500;
          color: var(--color-tomato);
          white-space: nowrap;
          flex-shrink: 0;
        }

        .card__description {
          font-size: 0.78rem;
          font-weight: 500;
          color: var(--color-gold);
          font-style: italic;
          margin-bottom: 6px;
        }

        .card__ingredients {
          font-size: 0.85rem;
          color: var(--color-stone);
          line-height: 1.5;
        }

        /* ── CTA button ── */
        .card__btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          align-self: flex-start;
          font-family: var(--font-body);
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-tomato);
          padding: 9px 18px;
          border: 1.5px solid var(--color-tomato);
          border-radius: var(--radius-pill);
          transition: background var(--transition-fast), color var(--transition-fast);
          cursor: pointer;
        }
        .card__btn:hover {
          background: var(--color-tomato);
          color: #fff;
        }
        .card__btn svg {
          transition: transform var(--transition-fast);
        }
        .card__btn:hover svg {
          transform: translateX(3px);
        }
      `}</style>
    </article>
  );
}
