"use client";
import { MenuItem } from "../data/menu";
import { useCart } from "./CartContext";

type Props = {
  item: MenuItem;
};

export default function ProductCard({ item }: Props) {
  const { addToCart } = useCart();

  return (
    <article className="card">
      {(item.popular || item.spicy || item.vegetarian) && (
        <div className="card__badges">
          {item.popular    && <span className="badge badge--popular">⭐ Popolare</span>}
          {item.spicy      && <span className="badge badge--spicy">🌶 Piccante</span>}
          {item.vegetarian && <span className="badge badge--veg">🌿 Vegetariana</span>}
        </div>
      )}

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

      <button
        className="card__btn"
        onClick={() => addToCart(item)}
        aria-label={`Aggiungi ${item.name} al carrello`}
      >
        Aggiungi
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      <style>{`
        .card {
          background: var(--color-surface, #fff);
          border: 1px solid var(--color-parchment, #EDE0CC);
          border-radius: var(--radius-md, 12px);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          box-shadow: var(--shadow-card, 0 2px 12px rgba(28,28,26,.08));
          transition: transform 0.25s, box-shadow 0.25s;
        }
        .card:hover { transform: translateY(-3px); box-shadow: var(--shadow-card-hover, 0 8px 32px rgba(28,28,26,.14)); }
        .card__badges { display: flex; flex-wrap: wrap; gap: 6px; }
        .badge { font-size: 0.68rem; font-weight: 500; letter-spacing: 0.04em; padding: 3px 9px; border-radius: 999px; white-space: nowrap; }
        .badge--popular { background: #FEF3DB; color: #8A5E12; border: 1px solid #F0D28A; }
        .badge--spicy   { background: #FDECEA; color: #8C2318; border: 1px solid #F5B4AD; }
        .badge--veg     { background: #EBF5EB; color: #245524; border: 1px solid #A8D4A8; }
        .card__body { flex: 1; }
        .card__header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 6px; }
        .card__name { font-family: var(--font-display, Georgia, serif); font-size: 1.05rem; font-weight: 700; color: var(--color-charcoal, #1C1C1A); line-height: 1.25; }
        .card__price { font-size: 1.05rem; font-weight: 500; color: var(--color-tomato, #B03A2E); white-space: nowrap; flex-shrink: 0; }
        .card__description { font-size: 0.78rem; font-weight: 500; color: var(--color-gold, #C9923A); font-style: italic; margin-bottom: 6px; }
        .card__ingredients { font-size: 0.85rem; color: var(--color-stone, #7A7770); line-height: 1.5; }
        .card__btn {
          display: inline-flex; align-items: center; gap: 7px; align-self: flex-start;
          font-family: var(--font-body, sans-serif); font-size: 0.875rem; font-weight: 500;
          color: var(--color-tomato, #B03A2E); padding: 9px 18px;
          border: 1.5px solid var(--color-tomato, #B03A2E); border-radius: 999px;
          background: transparent; transition: background 0.15s, color 0.15s; cursor: pointer;
        }
        .card__btn:hover { background: var(--color-tomato, #B03A2E); color: #fff; }
      `}</style>
    </article>
  );
}