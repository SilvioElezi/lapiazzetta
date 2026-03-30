"use client";
import { useState, useEffect } from "react";
import { useCart } from "./CartContext";

type SizeOption    = { name: string; extra: number };
type IngredientOpt = { name: string; default_selected: boolean };
type ExtraOption   = { name: string; extra: number };
type ProductOptions = {
  sizes?:       { enabled: boolean; items: SizeOption[] };
  ingredients?: { enabled: boolean; items: IngredientOpt[] };
  extras?:      { enabled: boolean; items: ExtraOption[] };
};

type MenuItem = {
  id: string; name: string; ingredients: string; price: number;
  popular?: boolean; spicy?: boolean; vegetarian?: boolean;
  description?: string; active?: boolean; image_url?: string;
  options?: ProductOptions; show_online?: boolean;
};
type MenuCategory = { category: string; emoji: string; items: MenuItem[] };

function ItemPill({ item }: { item: MenuItem }) {
  const { cart, addToCart, increase, decrease } = useCart();
  const [popupOpen, setPopupOpen] = useState(false);

  // Option selections
  const [selectedSizeIdx,    setSelectedSizeIdx]    = useState<number | null>(null);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
  const [selectedExtras,     setSelectedExtras]     = useState<Set<string>>(new Set());

  const sizes        = item.options?.sizes?.enabled       ? (item.options.sizes.items       ?? []) : [];
  const ingredOpts   = item.options?.ingredients?.enabled ? (item.options.ingredients.items ?? []) : [];
  const extras       = item.options?.extras?.enabled      ? (item.options.extras.items      ?? []) : [];
  const hasSizes     = sizes.length > 0;
  const hasIngr      = ingredOpts.length > 0;
  const hasExtras    = extras.length > 0;
  const hasOptions   = hasSizes || hasIngr || hasExtras;

  // Price calc
  const sizeExtra  = selectedSizeIdx !== null ? (sizes[selectedSizeIdx]?.extra ?? 0) : 0;
  const extrasTotal = Array.from(selectedExtras).reduce((s, name) => {
    return s + (extras.find((e) => e.name === name)?.extra ?? 0);
  }, 0);
  const effectivePrice = item.price + sizeExtra + extrasTotal;

  // Build cart key from current selections
  const optionParts: string[] = [];
  if (selectedSizeIdx !== null && sizes[selectedSizeIdx]) optionParts.push(sizes[selectedSizeIdx].name);
  ingredOpts.filter((i) => i.default_selected && !selectedIngredients.has(i.name)).forEach((i) => optionParts.push(`senza ${i.name}`));
  ingredOpts.filter((i) => !i.default_selected && selectedIngredients.has(i.name)).forEach((i) => optionParts.push(`+ ${i.name}`));
  Array.from(selectedExtras).forEach((name) => optionParts.push(`+ ${name}`));
  const optionLabel = optionParts.join(", ");
  const cartName    = item.name + (optionLabel ? ` · ${optionLabel}` : "");

  // Qty: total for badge, specific combo for popup
  const totalQty = cart.filter((c: any) => c.id === item.id).reduce((s: number, c: any) => s + c.qty, 0);
  const cartItem = cart.find((c: any) => c.name === cartName);
  const qty      = cartItem?.qty ?? 0;

  const handlePillClick = () => {
    setSelectedSizeIdx(null);
    setSelectedIngredients(new Set(ingredOpts.filter((i) => i.default_selected).map((i) => i.name)));
    setSelectedExtras(new Set());
    setPopupOpen(true);
  };

  const toggleIngr = (name: string) =>
    setSelectedIngredients((prev) => {
      const s = new Set(prev);
      s.has(name) ? s.delete(name) : s.add(name);
      return s;
    });

  const toggleExtra = (name: string) =>
    setSelectedExtras((prev) => {
      const s = new Set(prev);
      s.has(name) ? s.delete(name) : s.add(name);
      return s;
    });

  const canAdd = !hasSizes || selectedSizeIdx !== null;

  return (
    <>
      <button className={`pill-btn${totalQty > 0 ? " pill-btn--active" : ""}`} onClick={handlePillClick}>
        <span className="pill-btn__name">{item.name}</span>
        <span className="pill-btn__price">€{item.price.toFixed(2)}</span>
        {totalQty > 0 && <span className="pill-btn__qty">{totalQty}</span>}
        {item.spicy && <span className="pill-btn__flag">🌶</span>}
        {item.vegetarian && !item.spicy && <span className="pill-btn__flag">🌿</span>}
        {item.popular && <span className="pill-btn__flag">⭐</span>}
      </button>

      {popupOpen && (
        <>
          <div className="popup-backdrop" onClick={() => setPopupOpen(false)} />
          <div className="popup" role="dialog">
            {item.image_url && (
              <img src={item.image_url} alt={item.name}
                style={{width:"100%",height:180,objectFit:"cover",borderRadius:"12px 12px 0 0",display:"block"}} />
            )}
            <div className="popup__header">
              <div>
                <p className="popup__name">{item.name}</p>
                {item.description && <p className="popup__desc">{item.description}</p>}
                <p className="popup__ingredients">{item.ingredients}</p>
              </div>
              <button className="popup__close" onClick={() => setPopupOpen(false)}>✕</button>
            </div>

            {/* ── SIZES ── */}
            {hasSizes && (
              <div className="pop-opt-section">
                <p className="pop-opt-label">Dimensione <span className="pop-opt-req">*</span></p>
                <div className="pop-opt-pills">
                  {sizes.map((s, i) => (
                    <button
                      key={i}
                      className={`pop-size-btn${selectedSizeIdx === i ? " pop-size-btn--active" : ""}`}
                      onClick={() => setSelectedSizeIdx(i)}
                    >
                      {s.name}
                      {s.extra > 0 && <span className="pop-size-extra">+€{s.extra.toFixed(2)}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── INGREDIENTS ── */}
            {hasIngr && (
              <div className="pop-opt-section">
                <p className="pop-opt-label">Ingredienti</p>
                <div className="pop-ingr-list">
                  {ingredOpts.map((ing, i) => (
                    <label key={i} className="pop-ingr-row">
                      <input
                        type="checkbox"
                        checked={selectedIngredients.has(ing.name)}
                        onChange={() => toggleIngr(ing.name)}
                      />
                      <span className={selectedIngredients.has(ing.name) ? "" : "pop-ingr-removed"}>{ing.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* ── EXTRAS ── */}
            {hasExtras && (
              <div className="pop-opt-section">
                <p className="pop-opt-label">Extra aggiuntivi</p>
                <div className="pop-ingr-list">
                  {extras.map((ex, i) => (
                    <label key={i} className="pop-ingr-row">
                      <input
                        type="checkbox"
                        checked={selectedExtras.has(ex.name)}
                        onChange={() => toggleExtra(ex.name)}
                      />
                      <span>{ex.name}</span>
                      {ex.extra > 0 && <span className="pop-extra-price">+€{ex.extra.toFixed(2)}</span>}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {hasSizes && selectedSizeIdx === null && (
              <p className="pop-size-hint">Scegli la dimensione per continuare</p>
            )}

            <div className="popup__controls">
              <button
                className="qty-btn qty-btn--minus"
                style={{visibility: qty === 0 ? "hidden" : "visible"}}
                onClick={() => { decrease(cartName); if (qty <= 1) setPopupOpen(false); }}
              >−</button>
              <span className="qty-display">{qty}</span>
              <button
                className="qty-btn qty-btn--plus"
                disabled={!canAdd}
                onClick={() => canAdd && (qty === 0 ? addToCart({ ...item, name: cartName, price: effectivePrice }) : increase(cartName))}
              >+</button>
            </div>
            <div className="popup__footer">
              <span className="popup__unit-price">€{effectivePrice.toFixed(2)} cad.</span>
              <span className="popup__total">Totale: <strong>€{(effectivePrice * qty).toFixed(2)}</strong></span>
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
        .popup{position:fixed;bottom:0;left:0;right:0;z-index:201;background:#FDF6EC;border-radius:20px 20px 0 0;padding:0 0 40px;max-width:480px;margin:0 auto;box-shadow:0 -8px 40px rgba(28,28,26,.18);animation:slideUp .22s cubic-bezier(.22,1,.36,1);max-height:90vh;overflow-y:auto}
        @keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .popup__header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:8px;padding:20px 24px 0}
        .popup__name{font-family:var(--font-display,Georgia,serif);font-size:1.1rem;font-weight:700;color:#1C1C1A}
        .popup__desc{font-size:.78rem;font-weight:500;color:#C9923A;font-style:italic;margin-top:2px}
        .popup__ingredients{font-size:.78rem;color:#7A7770;margin-top:4px;line-height:1.4}
        .popup__close{background:rgba(28,28,26,.08);border:none;width:32px;height:32px;border-radius:50%;font-size:.9rem;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#1C1C1A;transition:background .15s}
        .popup__close:hover{background:rgba(28,28,26,.15)}

        /* Options */
        .pop-opt-section{margin:12px 24px 0;background:#fff;border:1px solid #EDE0CC;border-radius:10px;padding:12px 14px}
        .pop-opt-label{font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:#7A7770;margin-bottom:10px}
        .pop-opt-req{color:#B03A2E}
        .pop-opt-pills{display:flex;flex-wrap:wrap;gap:6px}
        .pop-size-btn{padding:7px 14px;background:#F5EADA;border:1.5px solid #EDE0CC;border-radius:999px;cursor:pointer;font-family:inherit;font-size:.82rem;font-weight:500;color:#1C1C1A;display:flex;align-items:center;gap:6px;transition:border-color .15s,background .15s}
        .pop-size-btn:hover{border-color:#B03A2E;background:#FFF0EE}
        .pop-size-btn--active{border-color:#B03A2E;background:#FFF0EE;color:#B03A2E}
        .pop-size-extra{font-size:.72rem;color:#7A7770}
        .pop-size-btn--active .pop-size-extra{color:#B03A2E}
        .pop-ingr-list{display:flex;flex-direction:column;gap:8px}
        .pop-ingr-row{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:.86rem;color:#1C1C1A}
        .pop-ingr-row input{width:16px;height:16px;accent-color:#B03A2E;cursor:pointer;flex-shrink:0}
        .pop-ingr-removed{text-decoration:line-through;color:#B0ACA5}
        .pop-extra-price{font-size:.75rem;color:#B03A2E;margin-left:auto;flex-shrink:0}
        .pop-size-hint{font-size:.75rem;color:#B03A2E;text-align:center;margin:10px 24px 0}

        .popup__controls{display:flex;align-items:center;justify-content:center;gap:28px;margin:20px 24px 12px}
        .qty-btn{width:48px;height:48px;border-radius:50%;border:2px solid #EDE0CC;background:#fff;font-size:1.5rem;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#1C1C1A;transition:border-color .15s,background .15s}
        .qty-btn:hover{border-color:#B03A2E}
        .qty-btn--plus{background:#B03A2E;border-color:#B03A2E;color:#fff}
        .qty-btn--plus:hover{background:#C9503F}
        .qty-btn:disabled{opacity:.4;cursor:not-allowed}
        .qty-display{font-family:var(--font-display,Georgia,serif);font-size:2rem;font-weight:700;color:#1C1C1A;min-width:40px;text-align:center}
        .popup__footer{display:flex;justify-content:space-between;align-items:center;padding:12px 24px 0;border-top:1px solid #EDE0CC;margin:0 24px}
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
