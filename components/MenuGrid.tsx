"use client";
import { useState, useEffect } from "react";
import { useCart } from "./CartContext";

type MenuItem = {
  id: string; name: string; ingredients: string; price: number;
  popular?: boolean; spicy?: boolean; vegetarian?: boolean;
  description?: string; active?: boolean; image_url?: string;
};
type MenuCategory = { category: string; emoji: string; items: MenuItem[] };

function ItemPill({ item }: { item: MenuItem }) {
  const { cart, addToCart, increase, decrease } = useCart();
  const [popupOpen, setPopupOpen] = useState(false);
  const cartItem = cart.find((c: any) => c.id === item.id);
  const qty = cartItem?.qty ?? 0;

  const handlePillClick = () => {
    setPopupOpen(true);
  };

  return (
    <>
      <button className={`pill-btn${qty > 0 ? " pill-btn--active" : ""}`} onClick={handlePillClick}>
        <span className="pill-btn__name">{item.name}</span>
        <span className="pill-btn__price">€{item.price.toFixed(2)}</span>
        {qty > 0 && <span className="pill-btn__qty">{qty}</span>}
        {item.spicy && <span className="pill-btn__flag">🌶</span>}
        {item.vegetarian && !item.spicy && <span className="pill-btn__flag">🌿</span>}
        {item.popular && <span className="pill-btn__flag">⭐</span>}
      </button>
      {popupOpen && (
        <>
          <div className="popup-backdrop" onClick={() => setPopupOpen(false)} />
          <div className="popup" role="dialog">
            {item.image_url && (
              <img src={item.image_url} alt={item.name} style={{width:"100%",height:180,objectFit:"cover",borderRadius:"12px 12px 0 0",display:"block"}} />
            )}
            <div className="popup__header">
              <div>
                <p className="popup__name">{item.name}</p>
                {item.description && <p className="popup__desc">{item.description}</p>}
                <p className="popup__ingredients">{item.ingredients}</p>
              </div>
              <button className="popup__close" onClick={() => setPopupOpen(false)}>✕</button>
            </div>
            <div className="popup__controls">
              <button className="qty-btn qty-btn--minus" style={{visibility: qty === 0 ? "hidden" : "visible"}} onClick={() => { decrease(item.name); if (qty <= 1) setPopupOpen(false); }}>−</button>
              <span className="qty-display">{qty}</span>
              <button className="qty-btn qty-btn--plus" onClick={() => qty === 0 ? addToCart(item) : increase(item.name)}>+</button>
            </div>
            <div className="popup__footer">
              <span className="popup__unit-price">€{item.price.toFixed(2)} cad.</span>
              <span className="popup__total">Totale: <strong>€{(item.price * qty).toFixed(2)}</strong></span>
            </div>
          </div>
        </>
      )}
      <style>{`
        .pill-btn{position:relative;display:flex;align-items:center;gap:8px;padding:10px 14px;background:#fff;border:1.5px solid #EDE0CC;border-radius:999px;cursor:pointer;font-family:var(--font-body,sans-serif);transition:border-color .15s,background .15s,transform .15s;white-space:nowrap}
        .pill-btn:hover{border-color:#B03A2E;background:#FFF8F7;transform:translateY(-1px)}
        .pill-btn--active{border-color:#B03A2E;background:#FFF0EE}
        .pill-btn__name{font-size:.88rem;font-weight:500;color:#1C1C1A}
        .pill-btn__price{font-size:.8rem;color:#7A7770}
        .pill-btn__qty{position:absolute;top:-7px;right:-7px;width:20px;height:20px;background:#B03A2E;color:#fff;font-size:.65rem;font-weight:700;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #fff}
        .pill-btn__flag{font-size:.75rem;margin-left:-2px}
        .popup-backdrop{position:fixed;inset:0;z-index:200;background:rgba(28,28,26,.4);backdrop-filter:blur(2px);animation:fadeIn .15s ease}
        .popup{position:fixed;bottom:0;left:0;right:0;z-index:201;background:#FDF6EC;border-radius:20px 20px 0 0;padding:24px 24px 40px;max-width:480px;margin:0 auto;box-shadow:0 -8px 40px rgba(28,28,26,.18);animation:slideUp .22s cubic-bezier(.22,1,.36,1)}
        @keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .popup__header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:20px}
        .popup__name{font-family:var(--font-display,Georgia,serif);font-size:1.1rem;font-weight:700;color:#1C1C1A}
        .popup__desc{font-size:.78rem;font-weight:500;color:#C9923A;font-style:italic;margin-top:2px}
        .popup__ingredients{font-size:.78rem;color:#7A7770;margin-top:4px;line-height:1.4}
        .popup__close{background:rgba(28,28,26,.08);border:none;width:32px;height:32px;border-radius:50%;font-size:.9rem;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#1C1C1A;transition:background .15s}
        .popup__close:hover{background:rgba(28,28,26,.15)}
        .popup__controls{display:flex;align-items:center;justify-content:center;gap:28px;margin-bottom:20px}
        .qty-btn{width:48px;height:48px;border-radius:50%;border:2px solid #EDE0CC;background:#fff;font-size:1.5rem;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#1C1C1A;transition:border-color .15s,background .15s}
        .qty-btn:hover{border-color:#B03A2E}
        .qty-btn--plus{background:#B03A2E;border-color:#B03A2E;color:#fff}
        .qty-btn--plus:hover{background:#C9503F}
        .qty-display{font-family:var(--font-display,Georgia,serif);font-size:2rem;font-weight:700;color:#1C1C1A;min-width:40px;text-align:center}
        .popup__footer{display:flex;justify-content:space-between;align-items:center;padding-top:16px;border-top:1px solid #EDE0CC}
        .popup__unit-price{font-size:.82rem;color:#7A7770}
        .popup__total{font-size:.9rem;color:#1C1C1A}
        .popup__total strong{color:#B03A2E;font-size:1.05rem}
      `}</style>
    </>
  );
}

export default function MenuGrid({ slug }: { slug?: string }) {
  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = slug ? `/${slug}/api/menu` : "/api/menu";
    fetch(url)
      .then((r) => r.json())
      .then((data) => { setMenu(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <section className="menu-grid" id="menu">
      <div className="container"><div style={{padding:"48px",textAlign:"center",color:"#7A7770"}}>Caricamento menu…</div></div>
      <style>{`.menu-grid{padding:48px 0 64px;background:var(--color-cream,#FDF6EC)}`}</style>
    </section>
  );

  return (
    <section className="menu-grid" id="menu">
      <div className="container">
        {menu.map((cat) => (
          <div key={cat.category} className="menu-cat">
            <h2 className="menu-cat__title"><span>{cat.emoji}</span>{cat.category}</h2>
            <div className="menu-cat__pills">
              {cat.items.filter((i) => i.active !== false).map((item) => (
                <ItemPill key={item.id} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <style>{`
        .menu-grid{padding:48px 0 64px;background:var(--color-cream,#FDF6EC)}
        .menu-cat{margin-bottom:36px}
        .menu-cat__title{font-family:var(--font-display,Georgia,serif);font-size:1.1rem;font-weight:700;color:#1C1C1A;margin-bottom:14px;display:flex;align-items:center;gap:8px}
        .menu-cat__pills{display:flex;flex-wrap:wrap;gap:8px}
      `}</style>
    </section>
  );
}
