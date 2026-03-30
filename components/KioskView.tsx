"use client";

import { useState, useEffect, useCallback } from "react";

type CartItem = { id: string; name: string; qty: number; price: number };
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
  options?: ProductOptions;
};
type MenuCategory = { id?: number; category: string; emoji: string; items: MenuItem[] };

type Props = {
  slug: string;
  tableName: string | null;
  tableToken: string | null;
  businessName: string;
  logoUrl?: string | null;
  menu: MenuCategory[];
};

export default function KioskView({ slug, tableName, tableToken, businessName, logoUrl, menu }: Props) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState(0);

  // Options popup
  const [popupItem, setPopupItem] = useState<MenuItem | null>(null);
  const [selectedSizeIdx, setSelectedSizeIdx] = useState<number | null>(null);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
  const [selectedExtras, setSelectedExtras] = useState<Set<string>>(new Set());

  // Checkout
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState("");

  // Done screen
  const [done, setDone] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [countdown, setCountdown] = useState(30);
  const [doneCart, setDoneCart] = useState<CartItem[]>([]);
  const [doneTotal, setDoneTotal] = useState(0);

  const total    = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const totalQty = cart.reduce((s, i) => s + i.qty, 0);

  const addToCart = useCallback((item: CartItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.name === item.name);
      if (existing) return prev.map(i => i.name === item.name ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
  }, []);

  const increase = (name: string) =>
    setCart(prev => prev.map(i => i.name === name ? { ...i, qty: i.qty + 1 } : i));

  const decrease = (name: string) =>
    setCart(prev => prev.map(i => i.name === name ? { ...i, qty: i.qty - 1 } : i).filter(i => i.qty > 0));

  const openPopup = (item: MenuItem) => {
    const ingredOpts = item.options?.ingredients?.enabled ? (item.options.ingredients.items ?? []) : [];
    setPopupItem(item);
    setSelectedSizeIdx(null);
    setSelectedIngredients(new Set(ingredOpts.filter(i => i.default_selected).map(i => i.name)));
    setSelectedExtras(new Set());
  };

  // Popup calculations
  const popupSizes   = popupItem?.options?.sizes?.enabled       ? (popupItem.options.sizes.items       ?? []) : [];
  const popupIngr    = popupItem?.options?.ingredients?.enabled ? (popupItem.options.ingredients.items ?? []) : [];
  const popupExtras  = popupItem?.options?.extras?.enabled      ? (popupItem.options.extras.items      ?? []) : [];
  const hasSizes     = popupSizes.length > 0;
  const hasIngr      = popupIngr.length > 0;
  const hasExtras    = popupExtras.length > 0;

  const sizeExtra     = selectedSizeIdx !== null ? (popupSizes[selectedSizeIdx]?.extra ?? 0) : 0;
  const extrasTotal   = Array.from(selectedExtras).reduce((s, n) => s + (popupExtras.find(e => e.name === n)?.extra ?? 0), 0);
  const popupPrice    = (popupItem?.price ?? 0) + sizeExtra + extrasTotal;

  const optParts: string[] = [];
  if (selectedSizeIdx !== null && popupSizes[selectedSizeIdx]) optParts.push(popupSizes[selectedSizeIdx].name);
  popupIngr.filter(i =>  i.default_selected && !selectedIngredients.has(i.name)).forEach(i => optParts.push(`senza ${i.name}`));
  popupIngr.filter(i => !i.default_selected &&  selectedIngredients.has(i.name)).forEach(i => optParts.push(`+ ${i.name}`));
  Array.from(selectedExtras).forEach(n => optParts.push(`+ ${n}`));
  const optLabel   = optParts.join(", ");
  const cartName   = popupItem ? (popupItem.name + (optLabel ? ` · ${optLabel}` : "")) : "";
  const canAddPop  = !hasSizes || selectedSizeIdx !== null;

  const addFromPopup = () => {
    if (!popupItem || !canAddPop) return;
    addToCart({ id: popupItem.id, name: cartName, price: popupPrice, qty: 1 });
    setPopupItem(null);
  };

  const placeOrder = async () => {
    setPlacing(true);
    setPlaceError("");
    try {
      const res = await fetch(`/${slug}/api/kiosk-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableToken,
          clientName: clientName.trim() || "Ospite",
          items: cart,
          total,
          notes: notes.trim(),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setDoneCart([...cart]);
        setDoneTotal(total);
        setOrderId(data.id);
        setCheckoutOpen(false);
        setDone(true);
      } else {
        setPlaceError(data.error ?? "Errore nell'invio dell'ordine");
      }
    } catch {
      setPlaceError("Errore di connessione");
    } finally {
      setPlacing(false);
    }
  };

  const resetKiosk = useCallback(() => {
    setCart([]);
    setDone(false);
    setOrderId("");
    setClientName("");
    setNotes("");
    setCheckoutOpen(false);
    setActiveCategory(0);
    setCountdown(30);
    setDoneCart([]);
    setDoneTotal(0);
  }, []);

  useEffect(() => {
    if (!done) return;
    setCountdown(30);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); resetKiosk(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [done, resetKiosk]);

  const currentCat = menu[activeCategory];

  if (done) {
    return (
      <div style={{ height: "100vh", width: "100vw", background: "#1C1C1A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, textAlign: "center", padding: 40, fontFamily: "'DM Sans',sans-serif", overflow: "hidden" }}>
        <style>{`html,body{margin:0;padding:0;overflow:hidden}`}</style>
        <div style={{ fontSize: "5rem" }}>✅</div>
        <h1 style={{ fontFamily: "Georgia,serif", fontSize: "2.2rem", color: "#FDF6EC", fontWeight: 700 }}>Ordine ricevuto!</h1>
        <p style={{ fontSize: "1rem", color: "#B0ACA5" }}>Il tuo ordine <strong style={{ color: "#FDF6EC" }}>#{orderId}</strong> è in preparazione.</p>
        <div style={{ background: "#2A2A28", borderRadius: 20, padding: "24px 40px", display: "flex", flexDirection: "column", gap: 12, alignItems: "center", minWidth: 300, maxWidth: 480 }}>
          {tableName && <p style={{ color: "#B03A2E", fontWeight: 700, fontSize: "1rem" }}>🪑 {tableName}</p>}
          <ul style={{ listStyle: "none", textAlign: "left", display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
            {doneCart.map(item => (
              <li key={item.name} style={{ fontSize: ".9rem", color: "#B0ACA5", display: "flex", justifyContent: "space-between" }}>
                <span><span style={{ color: "#B03A2E", fontWeight: 700, marginRight: 8 }}>{item.qty}×</span>{item.name}</span>
                <span>€{(item.price * item.qty).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <div style={{ borderTop: "1px solid #3A3A36", paddingTop: 12, width: "100%", display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#FDF6EC", fontWeight: 500 }}>Totale</span>
            <span style={{ fontFamily: "Georgia,serif", fontSize: "1.2rem", fontWeight: 700, color: "#FDF6EC" }}>€{doneTotal.toFixed(2)}</span>
          </div>
        </div>
        <p style={{ color: "#7A7770", fontSize: ".9rem" }}>
          Nuovo ordine in <strong style={{ color: "#B03A2E", fontSize: "1.1rem" }}>{countdown}</strong> secondi…
        </p>
        <button onClick={resetKiosk} style={{ padding: "16px 40px", background: "#B03A2E", color: "#fff", border: "none", borderRadius: 14, fontSize: "1rem", fontWeight: 700, cursor: "pointer", marginTop: 8 }}>
          Nuovo ordine
        </button>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", width: "100vw", display: "grid", gridTemplateRows: "64px 1fr 88px", overflow: "hidden", fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`html,body{margin:0;padding:0;overflow:hidden}`}</style>

      {/* ── HEADER ── */}
      <header style={{ background: "#B03A2E", display: "flex", alignItems: "center", padding: "0 24px", gap: 16, flexShrink: 0 }}>
        {logoUrl && <img src={logoUrl} alt="" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,.3)" }} />}
        <span style={{ fontFamily: "Georgia,serif", fontSize: "1.15rem", fontWeight: 700, color: "#FDF6EC", flex: 1 }}>{businessName}</span>
        {tableName && (
          <div style={{ background: "rgba(0,0,0,.2)", borderRadius: 12, padding: "8px 18px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "1.1rem" }}>🪑</span>
            <span style={{ color: "#FDF6EC", fontWeight: 700, fontSize: "1rem" }}>{tableName}</span>
          </div>
        )}
      </header>

      {/* ── BODY ── */}
      <div style={{ display: "grid", gridTemplateColumns: "190px 1fr", overflow: "hidden" }}>

        {/* Categories sidebar */}
        <nav style={{ background: "#2A2A28", overflowY: "auto", padding: "12px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
          {menu.map((cat, idx) => (
            <button
              key={cat.category}
              onClick={() => setActiveCategory(idx)}
              style={{
                padding: "13px 14px",
                background: activeCategory === idx ? "#B03A2E" : "transparent",
                color: activeCategory === idx ? "#FDF6EC" : "rgba(253,246,236,.55)",
                border: "none",
                borderRadius: 10,
                cursor: "pointer",
                textAlign: "left",
                fontSize: ".88rem",
                fontWeight: activeCategory === idx ? 700 : 400,
                display: "flex",
                alignItems: "center",
                gap: 10,
                transition: "background .15s, color .15s",
                fontFamily: "inherit",
              }}
            >
              <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>{cat.emoji}</span>
              <span>{cat.category}</span>
            </button>
          ))}
        </nav>

        {/* Items grid */}
        <div style={{ background: "#F5EADA", overflowY: "auto", padding: 20 }}>
          {currentCat && (
            <>
              <h2 style={{ fontFamily: "Georgia,serif", fontSize: "1.25rem", fontWeight: 700, color: "#1C1C1A", marginBottom: 20 }}>
                {currentCat.emoji} {currentCat.category}
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 16 }}>
                {currentCat.items.map(item => {
                  const itemQty  = cart.filter(c => c.id === item.id).reduce((s, c) => s + c.qty, 0);
                  const hasOpts  = !!(item.options?.sizes?.enabled || item.options?.ingredients?.enabled || item.options?.extras?.enabled);
                  return (
                    <div
                      key={item.id}
                      style={{
                        background: "#fff",
                        borderRadius: 16,
                        display: "flex",
                        flexDirection: "column",
                        border: itemQty > 0 ? "2.5px solid #B03A2E" : "2px solid #EDE0CC",
                        boxShadow: itemQty > 0 ? "0 4px 20px rgba(176,58,46,.15)" : "0 2px 8px rgba(28,28,26,.06)",
                        transition: "all .15s",
                        overflow: "hidden",
                        cursor: "pointer",
                      }}
                      onClick={() => hasOpts ? openPopup(item) : addToCart({ id: item.id, name: item.name, price: item.price, qty: 1 })}
                    >
                      {item.image_url && (
                        <img src={item.image_url} alt={item.name} style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }} />
                      )}
                      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: ".95rem", fontWeight: 700, color: "#1C1C1A", lineHeight: 1.3 }}>{item.name}</p>
                            {item.ingredients && (
                              <p style={{ fontSize: ".72rem", color: "#7A7770", marginTop: 4, lineHeight: 1.4 }}>{item.ingredients}</p>
                            )}
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <span style={{ fontSize: "1rem", fontWeight: 700, color: "#B03A2E" }}>€{item.price.toFixed(2)}</span>
                            <div style={{ display: "flex", gap: 3, justifyContent: "flex-end", marginTop: 3 }}>
                              {item.spicy && <span style={{ fontSize: ".7rem" }}>🌶</span>}
                              {item.vegetarian && <span style={{ fontSize: ".7rem" }}>🌿</span>}
                              {item.popular && <span style={{ fontSize: ".7rem" }}>⭐</span>}
                            </div>
                          </div>
                        </div>

                        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 8 }}>
                          {hasOpts
                            ? <span style={{ fontSize: ".7rem", color: "#7A7770" }}>Personalizzabile</span>
                            : <span />
                          }
                          {itemQty > 0 ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => decrease(item.name)}
                                style={{ width: 34, height: 34, border: "none", borderRadius: "50%", background: "#F5EADA", cursor: "pointer", fontSize: "1.3rem", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#1C1C1A" }}
                              >−</button>
                              <span style={{ fontWeight: 700, color: "#B03A2E", minWidth: 22, textAlign: "center", fontSize: "1rem" }}>{itemQty}</span>
                              <button
                                onClick={() => hasOpts ? openPopup(item) : addToCart({ id: item.id, name: item.name, price: item.price, qty: 1 })}
                                style={{ width: 34, height: 34, border: "none", borderRadius: "50%", background: "#B03A2E", color: "#fff", cursor: "pointer", fontSize: "1.3rem", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}
                              >+</button>
                            </div>
                          ) : (
                            <button
                              style={{ padding: "8px 16px", background: "#B03A2E", color: "#fff", border: "none", borderRadius: 10, fontSize: ".82rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                            >
                              + Aggiungi
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── CART BAR ── */}
      <div style={{ background: "#1C1C1A", borderTop: "2px solid #B03A2E", display: "flex", alignItems: "center", padding: "0 24px", gap: 16, flexShrink: 0 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          {totalQty > 0 ? (
            <>
              <span style={{ background: "#B03A2E", color: "#fff", borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".88rem", fontWeight: 700, flexShrink: 0 }}>{totalQty}</span>
              <span style={{ color: "rgba(253,246,236,.7)", fontSize: ".85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {cart.map(i => `${i.qty}× ${i.name}`).join(", ")}
              </span>
            </>
          ) : (
            <span style={{ color: "#7A7770", fontSize: ".88rem" }}>Seleziona i prodotti dal menu per iniziare l&apos;ordine</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
          {totalQty > 0 && (
            <span style={{ fontFamily: "Georgia,serif", fontSize: "1.35rem", fontWeight: 700, color: "#FDF6EC" }}>€{total.toFixed(2)}</span>
          )}
          <button
            onClick={() => totalQty > 0 && setCheckoutOpen(true)}
            disabled={totalQty === 0}
            style={{ padding: "14px 30px", background: totalQty > 0 ? "#B03A2E" : "#3A3A36", color: totalQty > 0 ? "#fff" : "#7A7770", border: "none", borderRadius: 12, fontSize: "1rem", fontWeight: 700, cursor: totalQty > 0 ? "pointer" : "not-allowed", transition: "background .15s", whiteSpace: "nowrap", fontFamily: "inherit" }}
          >
            {totalQty > 0 ? "Ordina ora →" : "Carrello vuoto"}
          </button>
        </div>
      </div>

      {/* ── OPTIONS POPUP ── */}
      {popupItem && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(28,28,26,.75)", zIndex: 100, backdropFilter: "blur(4px)" }} onClick={() => setPopupItem(null)} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 101, background: "#fff", borderRadius: 20, width: "90%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}>
            {popupItem.image_url && (
              <img src={popupItem.image_url} alt={popupItem.name} style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: "20px 20px 0 0", display: "block" }} />
            )}
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <h3 style={{ fontFamily: "Georgia,serif", fontSize: "1.25rem", fontWeight: 700, color: "#1C1C1A" }}>{popupItem.name}</h3>
                  {popupItem.ingredients && <p style={{ fontSize: ".82rem", color: "#7A7770", marginTop: 4 }}>{popupItem.ingredients}</p>}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "#B03A2E" }}>€{popupPrice.toFixed(2)}</span>
                  {popupPrice !== popupItem.price && (
                    <p style={{ fontSize: ".72rem", color: "#B0ACA5", textDecoration: "line-through" }}>€{popupItem.price.toFixed(2)}</p>
                  )}
                </div>
              </div>

              {hasSizes && (
                <div>
                  <p style={{ fontSize: ".82rem", fontWeight: 600, color: "#1C1C1A", marginBottom: 8 }}>Dimensione *</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {popupSizes.map((size, idx) => (
                      <button key={size.name} onClick={() => setSelectedSizeIdx(idx)}
                        style={{ padding: "10px 20px", border: `2px solid ${selectedSizeIdx === idx ? "#B03A2E" : "#EDE0CC"}`, borderRadius: 10, background: selectedSizeIdx === idx ? "#B03A2E" : "#fff", color: selectedSizeIdx === idx ? "#fff" : "#1C1C1A", fontSize: ".88rem", fontWeight: selectedSizeIdx === idx ? 600 : 400, cursor: "pointer", fontFamily: "inherit" }}>
                        {size.name}{size.extra > 0 ? ` +€${size.extra.toFixed(2)}` : ""}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {hasIngr && (
                <div>
                  <p style={{ fontSize: ".82rem", fontWeight: 600, color: "#1C1C1A", marginBottom: 8 }}>Ingredienti</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {popupIngr.map(ingr => {
                      const sel = selectedIngredients.has(ingr.name);
                      return (
                        <button key={ingr.name}
                          onClick={() => setSelectedIngredients(prev => { const s = new Set(prev); s.has(ingr.name) ? s.delete(ingr.name) : s.add(ingr.name); return s; })}
                          style={{ padding: "9px 16px", border: `2px solid ${sel ? "#1C1C1A" : "#EDE0CC"}`, borderRadius: 10, background: sel ? "#1C1C1A" : "#fff", color: sel ? "#FDF6EC" : "#1C1C1A", fontSize: ".82rem", cursor: "pointer", fontFamily: "inherit" }}>
                          {ingr.default_selected ? (sel ? `✓ ${ingr.name}` : `✗ ${ingr.name}`) : (sel ? `+ ${ingr.name}` : ingr.name)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {hasExtras && (
                <div>
                  <p style={{ fontSize: ".82rem", fontWeight: 600, color: "#1C1C1A", marginBottom: 8 }}>Extra</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {popupExtras.map(extra => {
                      const sel = selectedExtras.has(extra.name);
                      return (
                        <button key={extra.name}
                          onClick={() => setSelectedExtras(prev => { const s = new Set(prev); s.has(extra.name) ? s.delete(extra.name) : s.add(extra.name); return s; })}
                          style={{ padding: "9px 16px", border: `2px solid ${sel ? "#B03A2E" : "#EDE0CC"}`, borderRadius: 10, background: sel ? "#B03A2E" : "#fff", color: sel ? "#fff" : "#1C1C1A", fontSize: ".82rem", cursor: "pointer", fontFamily: "inherit" }}>
                          {sel ? "✓" : "+"} {extra.name} +€{extra.extra.toFixed(2)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {hasSizes && selectedSizeIdx === null && (
                <p style={{ fontSize: ".78rem", color: "#B03A2E" }}>* Seleziona una dimensione per continuare</p>
              )}

              <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                <button onClick={() => setPopupItem(null)}
                  style={{ flex: 1, padding: "14px", background: "#F5EADA", border: "none", borderRadius: 12, fontSize: ".9rem", cursor: "pointer", color: "#1C1C1A", fontFamily: "inherit" }}>
                  Annulla
                </button>
                <button onClick={addFromPopup} disabled={!canAddPop}
                  style={{ flex: 2, padding: "14px", background: canAddPop ? "#B03A2E" : "#B0ACA5", color: "#fff", border: "none", borderRadius: 12, fontSize: ".95rem", fontWeight: 700, cursor: canAddPop ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                  + Aggiungi €{popupPrice.toFixed(2)}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── CHECKOUT MODAL ── */}
      {checkoutOpen && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(28,28,26,.75)", zIndex: 100, backdropFilter: "blur(4px)" }} onClick={() => setCheckoutOpen(false)} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 101, background: "#fff", borderRadius: 20, width: "90%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,.35)", overflow: "hidden" }}>
            <div style={{ background: "#B03A2E", padding: "20px 24px", display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: "1.6rem" }}>{tableName ? "🪑" : "🧾"}</span>
              <div>
                <h3 style={{ fontFamily: "Georgia,serif", fontSize: "1.15rem", fontWeight: 700, color: "#FDF6EC" }}>{tableName ?? "Kiosk"}</h3>
                <p style={{ fontSize: ".8rem", color: "rgba(253,246,236,.7)" }}>Conferma il tuo ordine — paga alla cassa</p>
              </div>
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16, maxHeight: "70vh", overflowY: "auto" }}>
              <div>
                <p style={{ fontSize: ".8rem", fontWeight: 600, color: "#7A7770", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".04em" }}>Riepilogo ordine</p>
                <div style={{ background: "#F5EADA", borderRadius: 12, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 7 }}>
                  {cart.map(item => (
                    <div key={item.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: ".88rem" }}>
                      <span><span style={{ fontWeight: 700, color: "#B03A2E", marginRight: 8 }}>{item.qty}×</span>{item.name}</span>
                      <span style={{ color: "#7A7770", marginLeft: 8, whiteSpace: "nowrap" }}>€{(item.price * item.qty).toFixed(2)}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: "1px solid #EDE0CC", paddingTop: 8, marginTop: 4, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                    <span style={{ color: "#1C1C1A" }}>Totale</span>
                    <span style={{ fontFamily: "Georgia,serif", fontSize: "1.15rem", color: "#1C1C1A" }}>€{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: ".82rem", fontWeight: 600, color: "#7A7770" }}>
                Il tuo nome (opzionale)
                <input value={clientName} onChange={e => setClientName(e.target.value)}
                  placeholder="Es. Mario"
                  style={{ padding: "12px 14px", border: "1.5px solid #EDE0CC", borderRadius: 10, fontSize: ".95rem", fontFamily: "inherit", outline: "none" }} />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: ".82rem", fontWeight: 600, color: "#7A7770" }}>
                Note per la cucina (opzionale)
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Es. senza glutine, allergie, cottura…"
                  rows={2}
                  style={{ padding: "12px 14px", border: "1.5px solid #EDE0CC", borderRadius: 10, fontSize: ".88rem", fontFamily: "inherit", outline: "none", resize: "none" }} />
              </label>

              {placeError && (
                <p style={{ fontSize: ".83rem", color: "#B03A2E", background: "#FDECEA", padding: "10px 14px", borderRadius: 8 }}>{placeError}</p>
              )}

              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={() => setCheckoutOpen(false)}
                  style={{ flex: 1, padding: "15px", background: "#F5EADA", border: "none", borderRadius: 12, fontSize: ".9rem", cursor: "pointer", color: "#1C1C1A", fontWeight: 500, fontFamily: "inherit" }}>
                  Modifica
                </button>
                <button onClick={placeOrder} disabled={placing}
                  style={{ flex: 2, padding: "15px", background: "#B03A2E", color: "#fff", border: "none", borderRadius: 12, fontSize: "1rem", fontWeight: 700, cursor: placing ? "wait" : "pointer", fontFamily: "inherit" }}>
                  {placing ? "Invio in corso…" : "✅ Conferma ordine"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
