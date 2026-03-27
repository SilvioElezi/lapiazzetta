"use client";
import { useState } from "react";

type Item = { id: number; name: string; ingredients: string; price: number; tag?: string };
type Category = { emoji: string; label: string; items: Item[] };

const MENU: Category[] = [
  {
    emoji: "🍕", label: "Classiche",
    items: [
      { id: 1, name: "Margherita",      ingredients: "Pomodoro, fior di latte, basilico",                   price: 7.50 },
      { id: 2, name: "Diavola",         ingredients: "Pomodoro, fior di latte, salame piccante",             price: 8.50, tag: "🌶" },
      { id: 3, name: "Quattro Stagioni",ingredients: "Pomodoro, mozzarella, carciofi, prosciutto, funghi",  price: 9.00 },
      { id: 4, name: "Capricciosa",     ingredients: "Pomodoro, mozzarella, prosciutto cotto, funghi, olive",price: 9.00 },
    ],
  },
  {
    emoji: "⭐", label: "Gourmet",
    items: [
      { id: 5, name: "Burrata & Nduja", ingredients: "Pomodoro, burrata fresca, nduja calabrese, basilico",  price: 12.00, tag: "⭐" },
      { id: 6, name: "Crudo & Rucola",  ingredients: "Base bianca, mozzarella, prosciutto crudo, rucola, grana", price: 12.50, tag: "⭐" },
      { id: 7, name: "Tartufo Nero",    ingredients: "Base bianca, mozzarella, crema di tartufo, funghi porcini", price: 13.50, tag: "⭐" },
    ],
  },
  {
    emoji: "🥤", label: "Bevande",
    items: [
      { id: 8,  name: "Acqua naturale",  ingredients: "75 cl",  price: 1.50 },
      { id: 9,  name: "Coca-Cola",       ingredients: "33 cl",  price: 2.50 },
      { id: 10, name: "Birra artigianale",ingredients: "33 cl", price: 3.50 },
    ],
  },
];

export default function MenuDemo() {
  const [open, setOpen] = useState<Item | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState<number[]>([]);

  const openItem = (item: Item) => { setOpen(item); setQty(1); };
  const closeItem = () => setOpen(null);
  const addToCart = () => {
    if (!open) return;
    setAdded((prev) => [...prev, open.id]);
    setOpen(null);
  };

  return (
    <>
      <div className="demo-wrap">
        <div className="demo-label">
          <span className="demo-label__tag">Demo interattiva</span>
          <h2 className="demo-label__title">Così appare ai tuoi clienti</h2>
          <p className="demo-label__sub">Tocca una pizza per vedere l&apos;esperienza di ordinazione completa.</p>
        </div>

        {/* Phone frame */}
        <div className="phone">
          <div className="phone__bar">
            <span className="phone__bar-dot" />
            <span className="phone__bar-url">lapiaggetta.8bit.al</span>
            <span className="phone__bar-dot" />
          </div>
          <div className="phone__screen">

            {/* Mini hero */}
            <div className="ph-hero">
              <p className="ph-hero__name">🍕 La Piazzetta</p>
              <p className="ph-hero__sub">Pizzeria artigianale · Consegna a domicilio</p>
              <div className="ph-pills-row">
                <span className="ph-pill">🛵 Consegna €1.50</span>
                <span className="ph-pill">⏱ 30 min</span>
              </div>
            </div>

            {/* Menu */}
            <div className="ph-menu">
              {MENU.map((cat) => (
                <div key={cat.label} className="ph-cat">
                  <p className="ph-cat__title">{cat.emoji} {cat.label}</p>
                  <div className="ph-cat__items">
                    {cat.items.map((item) => (
                      <button
                        key={item.id}
                        className={`ph-item${added.includes(item.id) ? " ph-item--active" : ""}`}
                        onClick={() => openItem(item)}
                      >
                        <span className="ph-item__name">{item.name}</span>
                        <span className="ph-item__price">€{item.price.toFixed(2)}</span>
                        {item.tag && <span className="ph-item__tag">{item.tag}</span>}
                        {added.includes(item.id) && <span className="ph-item__badge">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Cart FAB */}
            {added.length > 0 && (
              <div className="ph-fab">
                <span className="ph-fab__icon">🛒</span>
                <span className="ph-fab__count">{added.length}</span>
              </div>
            )}

            {/* Popup */}
            {open && (
              <>
                <div className="ph-backdrop" onClick={closeItem} />
                <div className="ph-popup">
                  <div className="ph-popup__head">
                    <div>
                      <p className="ph-popup__name">{open.name}</p>
                      <p className="ph-popup__ing">{open.ingredients}</p>
                    </div>
                    <button className="ph-popup__close" onClick={closeItem}>✕</button>
                  </div>
                  <div className="ph-popup__controls">
                    <button className="ph-qty" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
                    <span className="ph-qty-num">{qty}</span>
                    <button className="ph-qty ph-qty--plus" onClick={() => setQty((q) => q + 1)}>+</button>
                  </div>
                  <div className="ph-popup__foot">
                    <span className="ph-popup__total">€{(open.price * qty).toFixed(2)}</span>
                    <button className="ph-add" onClick={addToCart}>Aggiungi →</button>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      </div>

      <style>{`
        .demo-wrap{max-width:1100px;margin:0 auto;padding:80px 24px;display:grid;grid-template-columns:1fr auto;gap:60px;align-items:center}
        @media(max-width:760px){.demo-wrap{grid-template-columns:1fr;text-align:center}}

        .demo-label__tag{display:inline-block;font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:#E8A838;margin-bottom:12px}
        .demo-label__title{font-family:Georgia,serif;font-size:clamp(1.6rem,3.5vw,2.4rem);font-weight:700;color:#fff;line-height:1.2;margin-bottom:14px}
        .demo-label__sub{font-size:.95rem;color:#9A9590;line-height:1.7;max-width:420px}
        @media(max-width:760px){.demo-label__sub{margin:0 auto}}

        /* Phone shell */
        .phone{width:300px;flex-shrink:0;background:#111;border-radius:36px;border:2px solid #2A2A2A;box-shadow:0 32px 80px rgba(0,0,0,.6);overflow:hidden;position:relative;margin:0 auto}
        .phone__bar{height:36px;background:#0D0D0D;display:flex;align-items:center;justify-content:space-between;padding:0 16px;border-bottom:1px solid #1A1A1A}
        .phone__bar-dot{width:8px;height:8px;border-radius:50%;background:#2A2A2A}
        .phone__bar-url{font-size:.6rem;color:#4A4A48;letter-spacing:.04em}
        .phone__screen{height:560px;overflow-y:auto;background:#FDF6EC;scrollbar-width:none}
        .phone__screen::-webkit-scrollbar{display:none}

        /* Mini hero inside phone */
        .ph-hero{background:#1C1C1A;padding:18px 14px 14px;color:#FDF6EC}
        .ph-hero__name{font-family:Georgia,serif;font-size:.95rem;font-weight:700}
        .ph-hero__sub{font-size:.62rem;color:rgba(253,246,236,.5);margin-top:2px;margin-bottom:8px}
        .ph-pills-row{display:flex;gap:6px;flex-wrap:wrap}
        .ph-pill{font-size:.58rem;padding:3px 8px;background:rgba(253,246,236,.08);border:1px solid rgba(253,246,236,.12);border-radius:999px;color:rgba(253,246,236,.6)}

        /* Menu inside phone */
        .ph-menu{padding:12px 10px 80px}
        .ph-cat{margin-bottom:16px}
        .ph-cat__title{font-size:.7rem;font-weight:700;color:#1C1C1A;margin-bottom:8px;font-family:Georgia,serif}
        .ph-cat__items{display:flex;flex-wrap:wrap;gap:6px}
        .ph-item{position:relative;display:flex;align-items:center;gap:6px;padding:7px 10px;background:#fff;border:1.5px solid #EDE0CC;border-radius:999px;cursor:pointer;font-family:inherit;transition:border-color .15s,background .15s;white-space:nowrap}
        .ph-item:hover{border-color:#B03A2E;background:#FFF8F7}
        .ph-item--active{border-color:#B03A2E;background:#FFF0EE}
        .ph-item__name{font-size:.68rem;font-weight:500;color:#1C1C1A}
        .ph-item__price{font-size:.62rem;color:#7A7770}
        .ph-item__tag{font-size:.6rem}
        .ph-item__badge{position:absolute;top:-5px;right:-5px;width:14px;height:14px;background:#B03A2E;color:#fff;font-size:.45rem;font-weight:700;border-radius:50%;display:flex;align-items:center;justify-content:center;border:1.5px solid #FDF6EC}

        /* FAB inside phone */
        .ph-fab{position:absolute;bottom:16px;right:16px;width:42px;height:42px;background:#B03A2E;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1rem;box-shadow:0 4px 14px rgba(176,58,46,.4);animation:popIn .2s cubic-bezier(.22,1,.36,1)}
        @keyframes popIn{from{transform:scale(0)}to{transform:scale(1)}}
        .ph-fab__count{position:absolute;top:-3px;right:-3px;width:16px;height:16px;background:#C9923A;color:#fff;font-size:.5rem;font-weight:700;border-radius:50%;display:flex;align-items:center;justify-content:center;border:1.5px solid #FDF6EC}

        /* Popup inside phone */
        .ph-backdrop{position:absolute;inset:0;background:rgba(28,28,26,.4);z-index:10}
        .ph-popup{position:absolute;bottom:0;left:0;right:0;z-index:11;background:#FDF6EC;border-radius:16px 16px 0 0;padding:16px 14px 20px;box-shadow:0 -4px 20px rgba(28,28,26,.15);animation:slideUp .2s cubic-bezier(.22,1,.36,1)}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        .ph-popup__head{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:14px}
        .ph-popup__name{font-family:Georgia,serif;font-size:.88rem;font-weight:700;color:#1C1C1A}
        .ph-popup__ing{font-size:.65rem;color:#7A7770;margin-top:3px;line-height:1.4}
        .ph-popup__close{background:rgba(28,28,26,.08);border:none;width:24px;height:24px;border-radius:50%;font-size:.7rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#1C1C1A}
        .ph-popup__controls{display:flex;align-items:center;justify-content:center;gap:20px;margin-bottom:14px}
        .ph-qty{width:36px;height:36px;border-radius:50%;border:1.5px solid #EDE0CC;background:#fff;font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#1C1C1A}
        .ph-qty--plus{background:#B03A2E;border-color:#B03A2E;color:#fff}
        .ph-qty-num{font-family:Georgia,serif;font-size:1.4rem;font-weight:700;color:#1C1C1A;min-width:28px;text-align:center}
        .ph-popup__foot{display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid #EDE0CC}
        .ph-popup__total{font-family:Georgia,serif;font-size:1rem;font-weight:700;color:#B03A2E}
        .ph-add{padding:9px 18px;background:#B03A2E;color:#fff;border:none;border-radius:8px;font-size:.75rem;font-weight:500;cursor:pointer;font-family:inherit}
      `}</style>
    </>
  );
}
