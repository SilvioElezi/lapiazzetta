"use client";
import { useState } from "react";
import { useCart } from "./CartContext";
import { buildTelegramOrder } from "../utils/telegram";

export default function Cart() {
  const { cart, increase, decrease, remove, total } = useCart();
  const [open, setOpen] = useState(false);

  const itemCount = cart.reduce((sum: number, i: any) => sum + i.qty, 0);

  // Build the Telegram message
  const buildMessage = () => {
    const lines = cart.map(
      (i: any) => `- ${i.name} x${i.qty}  €${(i.price * i.qty).toFixed(2)}`
    );
    lines.push(`\nTotale: €${total.toFixed(2)}`);
    return `Ciao! Vorrei ordinare:\n${lines.join("\n")}`;
  };

  return (
    <>
      {/* Floating cart button */}
      <button
        className="cart-fab"
        onClick={() => setOpen(true)}
        aria-label="Apri carrello"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
        </svg>
        {itemCount > 0 && (
          <span className="cart-fab__badge">{itemCount}</span>
        )}
      </button>

      {/* Overlay */}
      {open && (
        <div className="cart-overlay" onClick={() => setOpen(false)} />
      )}

      {/* Drawer */}
      <aside className={`cart-drawer${open ? " cart-drawer--open" : ""}`} aria-label="Carrello">
        {/* Header */}
        <div className="cart-drawer__header">
          <h2 className="cart-drawer__title">Il tuo ordine</h2>
          <button className="cart-drawer__close" onClick={() => setOpen(false)} aria-label="Chiudi">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="cart-drawer__body">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <span className="cart-empty__icon">🛒</span>
              <p>Il carrello è vuoto</p>
              <small>Aggiungi qualcosa dal menu!</small>
            </div>
          ) : (
            <ul className="cart-items">
              {cart.map((item: any) => (
                <li key={item.id} className="cart-item">
                  <div className="cart-item__info">
                    <span className="cart-item__name">{item.name}</span>
                    <span className="cart-item__price">€{(item.price * item.qty).toFixed(2)}</span>
                  </div>
                  <div className="cart-item__controls">
                    <button onClick={() => decrease(item.name)} aria-label="Diminuisci">−</button>
                    <span>{item.qty}</span>
                    <button onClick={() => increase(item.name)} aria-label="Aumenta">+</button>
                    <button className="cart-item__remove" onClick={() => remove(item.name)} aria-label="Rimuovi">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                        <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="cart-drawer__footer">
            <div className="cart-total">
              <span>Totale</span>
              <span className="cart-total__amount">€{total.toFixed(2)}</span>
            </div>
            <a
              href={buildTelegramOrder(buildMessage())}
              target="_blank"
              rel="noopener noreferrer"
              className="cart-send-btn"
              onClick={() => setOpen(false)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              Invia ordine su Telegram
            </a>
            <p className="cart-note">
              Verrai reindirizzato su Telegram per confermare l'ordine.
            </p>
          </div>
        )}
      </aside>

      <style>{`
        /* ── FAB ── */
        .cart-fab {
          position: fixed; bottom: 28px; right: 28px; z-index: 100;
          width: 56px; height: 56px; border-radius: 50%;
          background: var(--color-tomato, #B03A2E); color: #fff;
          border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 20px rgba(176,58,46,0.45);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .cart-fab:hover { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(176,58,46,0.55); }
        .cart-fab__badge {
          position: absolute; top: -4px; right: -4px;
          background: var(--color-gold, #C9923A); color: #fff;
          font-size: 0.7rem; font-weight: 700; min-width: 20px; height: 20px;
          border-radius: 10px; display: flex; align-items: center; justify-content: center;
          padding: 0 5px; border: 2px solid #fff;
        }

        /* ── Overlay ── */
        .cart-overlay {
          position: fixed; inset: 0; z-index: 101;
          background: rgba(28,28,26,0.45);
          backdrop-filter: blur(2px);
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

        /* ── Drawer ── */
        .cart-drawer {
          position: fixed; top: 0; right: 0; bottom: 0; z-index: 102;
          width: 100%; max-width: 400px;
          background: var(--color-cream, #FDF6EC);
          display: flex; flex-direction: column;
          transform: translateX(100%);
          transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
          box-shadow: -8px 0 40px rgba(28,28,26,0.15);
        }
        .cart-drawer--open { transform: translateX(0); }

        /* ── Drawer header ── */
        .cart-drawer__header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--color-parchment, #EDE0CC);
          background: var(--color-charcoal, #1C1C1A);
        }
        .cart-drawer__title {
          font-family: var(--font-display, Georgia, serif);
          font-size: 1.2rem; font-weight: 700; color: var(--color-cream, #FDF6EC);
        }
        .cart-drawer__close {
          background: rgba(253,246,236,0.1); border: none; color: var(--color-cream, #FDF6EC);
          width: 36px; height: 36px; border-radius: 50%; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s;
        }
        .cart-drawer__close:hover { background: rgba(253,246,236,0.2); }

        /* ── Drawer body ── */
        .cart-drawer__body { flex: 1; overflow-y: auto; padding: 16px 24px; }

        /* ── Empty state ── */
        .cart-empty {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 8px; height: 200px;
          color: var(--color-stone, #7A7770); text-align: center;
        }
        .cart-empty__icon { font-size: 2.5rem; }
        .cart-empty p { font-weight: 500; color: var(--color-charcoal, #1C1C1A); }
        .cart-empty small { font-size: 0.82rem; }

        /* ── Items ── */
        .cart-items { list-style: none; display: flex; flex-direction: column; gap: 4px; }
        .cart-item {
          display: flex; flex-direction: column; gap: 8px;
          padding: 12px 14px;
          background: #fff; border: 1px solid var(--color-parchment, #EDE0CC);
          border-radius: 10px;
        }
        .cart-item__info { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
        .cart-item__name { font-size: 0.9rem; font-weight: 500; color: var(--color-charcoal, #1C1C1A); }
        .cart-item__price { font-size: 0.9rem; font-weight: 500; color: var(--color-tomato, #B03A2E); white-space: nowrap; }
        .cart-item__controls { display: flex; align-items: center; gap: 8px; }
        .cart-item__controls button {
          width: 28px; height: 28px; border-radius: 50%;
          border: 1px solid var(--color-parchment, #EDE0CC);
          background: var(--color-cream, #FDF6EC);
          color: var(--color-charcoal, #1C1C1A);
          font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: background 0.15s;
        }
        .cart-item__controls button:hover { background: var(--color-parchment, #EDE0CC); }
        .cart-item__controls span { font-size: 0.95rem; font-weight: 500; min-width: 20px; text-align: center; }
        .cart-item__remove { margin-left: auto; color: var(--color-stone, #7A7770) !important; }
        .cart-item__remove:hover { color: var(--color-tomato, #B03A2E) !important; }

        /* ── Footer ── */
        .cart-drawer__footer {
          padding: 20px 24px;
          border-top: 1px solid var(--color-parchment, #EDE0CC);
          display: flex; flex-direction: column; gap: 12px;
          background: #fff;
        }
        .cart-total { display: flex; justify-content: space-between; align-items: center; }
        .cart-total span { font-size: 0.85rem; color: var(--color-stone, #7A7770); font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em; }
        .cart-total__amount { font-family: var(--font-display, Georgia, serif); font-size: 1.5rem; font-weight: 700; color: var(--color-charcoal, #1C1C1A); }

        .cart-send-btn {
          display: flex; align-items: center; justify-content: center; gap: 10px;
          padding: 14px; border-radius: 12px;
          background: #229ED9; color: #fff;
          font-size: 0.95rem; font-weight: 500;
          text-decoration: none;
          transition: background 0.2s, transform 0.15s;
          box-shadow: 0 2px 12px rgba(34,158,217,0.35);
        }
        .cart-send-btn:hover { background: #1a8abf; transform: translateY(-1px); }

        .cart-note {
          font-size: 0.72rem; color: var(--color-stone-light, #B0ACA5);
          text-align: center; line-height: 1.4;
        }
      `}</style>
    </>
  );
}
