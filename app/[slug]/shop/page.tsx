"use client";
import { use, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../../../lib/supabase";
import type { Order, MenuCategory, MenuItem, StaffUser, StaffRole, WeekHours, DayHours, KioskTable } from "../../../lib/types";

function elapsed(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "adesso";
  if (mins === 1) return "1 min fa";
  return `${mins} min fa`;
}
function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

const DAY_LABELS: Record<string, string> = {
  monday: "Lunedì", tuesday: "Martedì", wednesday: "Mercoledì",
  thursday: "Giovedì", friday: "Venerdì", saturday: "Sabato", sunday: "Domenica"
};
const DAY_KEYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

// ─── LOGIN ─────────────────────────────────────────────────
function LoginScreen({ onLogin, slug }: { onLogin: (user: StaffUser) => void; slug: string }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const login = async () => {
    if (!username || !password) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`/${slug}/api/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Errore"); }
      else {
        const user = { ...data.user, businesses: data.businesses ?? [] };
        localStorage.setItem("shop_user", JSON.stringify(user));
        onLogin(user);
      }
    } catch { setError("Errore di connessione"); }
    finally { setLoading(false); }
  };

  return (
    <div className="login">
      <div className="login__card">
        <div className="login__logo">🍕</div>
        <h1 className="login__title">Staff Dashboard</h1>
        <p className="login__sub">Accesso riservato al personale</p>
        <input className="login__input" type="text" placeholder="Username"
          value={username} onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && login()} autoFocus />
        <input className="login__input" type="password" placeholder="Password"
          value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && login()} />
        <button className="login__btn" onClick={login} disabled={loading}>
          {loading ? "Accesso…" : "Accedi"}
        </button>
        {error && <p className="login__err">{error}</p>}
      </div>
    </div>
  );
}

// ─── ORDERS TAB ────────────────────────────────────────────
function OrdersTab({ role, slug }: { role: StaffRole; slug: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [, setTick] = useState(0);

  const fetchOrders = useCallback(async () => {
    const res = await fetch(`/${slug}/api/orders`);
    setOrders(await res.json());
  }, [slug]);

  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel(`orders-rt-${slug}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, fetchOrders)
      .subscribe();
    const tick = setInterval(() => setTick((t) => t + 1), 30000);
    return () => { supabase.removeChannel(channel); clearInterval(tick); };
  }, [fetchOrders, slug]);

  const markReady     = async (id: string) => { await fetch(`/${slug}/api/order/${id}`, { method: "PATCH" }); };
  const markDelivered = async (id: string) => { await fetch(`/${slug}/api/order/${id}`, { method: "DELETE" }); };

  const visible = orders.filter((o) => {
    if (role === "delivery") return o.status === "ready";
    return true;
  });

  const newOrders   = orders.filter((o) => o.status === "new");
  const readyOrders = orders.filter((o) => o.status === "ready");

  return (
    <div className="tab-content">
      <div className="orders-stats">
        {role !== "delivery" && <span className="stat-pill stat-pill--new">🆕 {newOrders.length} nuovi</span>}
        <span className="stat-pill stat-pill--ready">✅ {readyOrders.length} pronti</span>
        <span className="shop__live">● Real-time</span>
      </div>

      {visible.length === 0 ? (
        <div className="empty-state">
          <span>{role === "delivery" ? "🛵" : "🍃"}</span>
          <p>{role === "delivery" ? "Nessuna consegna pronta" : "Nessun ordine attivo"}</p>
          <small>{role === "delivery" ? "Gli ordini pronti appariranno qui" : "Gli ordini appariranno automaticamente"}</small>
        </div>
      ) : (
        <div className="orders-grid">
          {visible.map((order) => (
            <div key={order.id} className={`order-card${order.status === "ready" ? " order-card--ready" : ""}${order.order_type === "kiosk" ? " order-card--kiosk" : ""}`}>
              <div className="order-card__head">
                <div>
                  <span className="order-id">#{order.id}</span>
                  <span className={`status-badge${order.status === "ready" ? " status-badge--ready" : ""}`}>
                    {order.status === "new" ? "Nuovo" : "Pronto"}
                  </span>
                  {order.order_type === "kiosk" && (
                    <span className="kiosk-badge">🪑 Kiosk</span>
                  )}
                </div>
                <span className="order-time">{elapsed(order.placed_at)}</span>
              </div>
              <div className="order-client">
                <p className="order-client__name">{order.client_name}</p>
                {order.order_type === "kiosk" ? (
                  <span className="order-client__table">🪑 {order.table_name}</span>
                ) : (
                  <>
                    {order.phone && <a href={`tel:${order.phone}`} className="order-client__link">📞 {order.phone}</a>}
                    <a href={order.lat ? `https://maps.google.com/?q=${order.lat},${order.lng}` : `https://maps.google.com/?q=${encodeURIComponent(order.address)}`}
                      target="_blank" rel="noopener noreferrer" className="order-client__link">📍 {order.address}</a>
                  </>
                )}
              </div>
              <ul className="order-items">
                {order.items.filter((it) => it.id !== "_notes_").map((item) => (
                  <li key={item.id} className="order-item">
                    <span className="order-item__qty">{item.qty}×</span>
                    <span className="order-item__name">{item.name}</span>
                    <span className="order-item__price">€{(item.price * item.qty).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              {order.items.find((it) => it.id === "_notes_") && (
                <div className="order-notes">
                  <span>📝</span>
                  <span>{order.items.find((it) => it.id === "_notes_")!.name}</span>
                </div>
              )}
              <div className="order-total">
                <span>Totale</span>
                <span className="order-total__amt">€{order.total.toFixed(2)}</span>
              </div>
              <div className="order-actions">
                {order.status === "new" && role !== "delivery" && (
                  <button className="action-btn action-btn--ready" onClick={() => markReady(order.id)}>
                    ✅ Ordine pronto
                  </button>
                )}
                {order.status === "ready" && role !== "reception" && (
                  <button className="action-btn action-btn--delivered" onClick={() => markDelivered(order.id)}>
                    {order.order_type === "kiosk" ? "🪑 Servito al tavolo" : "🛵 Consegnato"}
                  </button>
                )}
                {order.status === "ready" && role === "admin" && (
                  <button className="action-btn action-btn--ready" onClick={() => markReady(order.id)}
                    style={{background:"#888"}}>
                    ↩ Rimetti nuovo
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SETTINGS TAB ──────────────────────────────────────────
function SettingsTab({ slug }: { slug: string }) {
  const [onlineOrders, setOnlineOrders] = useState(true);
  const [hours, setHours] = useState<WeekHours | null>(null);
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  useEffect(() => {
    fetch(`/${slug}/api/settings`).then((r) => r.json()).then((data) => {
      setOnlineOrders(data.online_orders ?? true);
      setHours(data.hours ?? null);
      setDeliveryFee(data.delivery_fee != null ? String(data.delivery_fee) : "0");
    });
  }, [slug]);

  const saveSetting = async (key: string, value: unknown) => {
    setSaving(true);
    await fetch(`/${slug}/api/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleOnline = async () => {
    const next = !onlineOrders;
    setOnlineOrders(next);
    await saveSetting("online_orders", next);
  };

  const updateDay = (day: string, field: keyof DayHours, val: unknown) => {
    setHours((prev) => {
      if (!prev) return prev;
      return { ...prev, [day]: { ...prev[day as keyof WeekHours], [field]: val } };
    });
  };

  const saveHours = () => saveSetting("hours", hours);

  return (
    <div className="tab-content">
      <div className="settings-card">
        <div className="settings-card__head">
          <div>
            <h3 className="settings-card__title">Ordini online</h3>
            <p className="settings-card__sub">Disattiva per bloccare nuovi ordini dal sito</p>
          </div>
          <button
            className={`toggle-btn${onlineOrders ? " toggle-btn--on" : " toggle-btn--off"}`}
            onClick={toggleOnline}
          >
            <span className="toggle-btn__dot" />
            <span className="toggle-btn__label">{onlineOrders ? "Attivi" : "Disattivi"}</span>
          </button>
        </div>
        {!onlineOrders && (
          <div className="settings-card__warning">
            ⚠️ Gli ordini online sono disattivati. I clienti vedranno un messaggio di chiusura.
          </div>
        )}
      </div>

      <div className="settings-card">
        <div className="settings-card__head">
          <div>
            <h3 className="settings-card__title">Costo di consegna</h3>
            <p className="settings-card__sub">Aggiunto automaticamente ad ogni ordine</p>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,border:"1.5px solid #EDE0CC",borderRadius:8,padding:"6px 10px",background:"#fff"}}>
              <span style={{fontSize:".85rem",color:"#7A7770"}}>€</span>
              <input
                type="number" min="0" step="0.50"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                style={{width:64,border:"none",outline:"none",fontSize:".9rem",fontFamily:"inherit",color:"#1C1C1A",background:"transparent"}}
              />
            </div>
            <button className="btn-save-hours" onClick={() => saveSetting("delivery_fee", parseFloat(deliveryFee) || 0)}>Salva</button>
          </div>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card__head">
          <div>
            <h3 className="settings-card__title">Orari di apertura</h3>
            <p className="settings-card__sub">Visibili sul sito nella sezione Contatti</p>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {saved  && <span className="saved-badge">✓ Salvato</span>}
            {saving && <span className="saving-badge">Salvataggio…</span>}
            <button className="btn-save-hours" onClick={saveHours}>Salva orari</button>
          </div>
        </div>

        {hours && (
          <div className="hours-editor">
            {DAY_KEYS.map((day) => {
              const d = hours[day as keyof WeekHours];
              return (
                <div key={day} className="hours-row-edit">
                  <label className="hours-day-toggle">
                    <input type="checkbox" checked={d.open}
                      onChange={(e) => updateDay(day, "open", e.target.checked)} />
                    <span className="hours-day-name">{DAY_LABELS[day]}</span>
                  </label>
                  {d.open ? (
                    <div style={{display:"flex",flexDirection:"column",gap:4}}>
                      <div className="hours-times">
                        <input type="time" value={d.from}
                          onChange={(e) => updateDay(day, "from", e.target.value)}
                          className="time-input" />
                        <span className="hours-sep">–</span>
                        <input type="time" value={d.to}
                          onChange={(e) => updateDay(day, "to", e.target.value)}
                          className="time-input" />
                      </div>
                      {d.from2 != null && d.from2 !== "" ? (
                        <div className="hours-times">
                          <input type="time" value={d.from2 ?? ""}
                            onChange={(e) => updateDay(day, "from2", e.target.value)}
                            className="time-input" />
                          <span className="hours-sep">–</span>
                          <input type="time" value={d.to2 ?? ""}
                            onChange={(e) => updateDay(day, "to2", e.target.value)}
                            className="time-input" />
                          <button type="button" onClick={() => updateDay(day, "from2", "")}
                            style={{background:"transparent",border:"none",cursor:"pointer",color:"#B03A2E",fontSize:".8rem",padding:"0 4px"}}>✕</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => { updateDay(day, "from2", "12:00"); updateDay(day, "to2", "14:30"); }}
                          style={{background:"transparent",border:"1px dashed #EDE0CC",borderRadius:6,cursor:"pointer",color:"#7A7770",fontSize:".75rem",padding:"3px 8px",textAlign:"left",width:"fit-content"}}>
                          + Secondo turno
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="hours-closed">Chiuso</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MENU TAB ──────────────────────────────────────────────
function MenuTab({ slug }: { slug: string }) {
  const [menu, setMenu]         = useState<MenuCategory[]>([]);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [editingItem, setEditingItem] = useState<{ catIdx: number; itemIdx: number | null } | null>(null);
  const [draft, setDraft]       = useState<MenuItem>({ id: newId(), name: "", ingredients: "", price: 0, popular: false, spicy: false, vegetarian: false, active: true, image_url: "" });
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatEmoji, setNewCatEmoji] = useState("🍕");
  const [uploadingItemImg, setUploadingItemImg] = useState(false);

  const uploadItemImage = async (file: File) => {
    setUploadingItemImg(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`/${slug}/api/upload`, { method: "POST", body: fd });
      const d = await res.json();
      if (d.url) setDraft((prev) => ({ ...prev, image_url: d.url }));
    } catch {}
    finally { setUploadingItemImg(false); }
  };

  useEffect(() => {
    fetch(`/${slug}/api/menu`).then((r) => r.json()).then(setMenu).catch(() => {});
  }, [slug]);

  const saveCategory = async (cat: MenuCategory) => {
    setSaving(true);
    await fetch(`/${slug}/api/menu`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify([cat]) });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const toggleActive = (ci: number, ii: number) => {
    const updated = menu.map((cat, c) => c !== ci ? cat : { ...cat, items: cat.items.map((item, i) => i !== ii ? item : { ...item, active: !item.active }) });
    setMenu(updated); saveCategory(updated[ci]);
  };
  const deleteItem = (ci: number, ii: number) => {
    if (!confirm("Eliminare?")) return;
    const updated = menu.map((cat, c) => c !== ci ? cat : { ...cat, items: cat.items.filter((_, i) => i !== ii) });
    setMenu(updated); saveCategory(updated[ci]);
  };
  const deleteCategory = async (ci: number) => {
    if (!confirm(`Eliminare "${menu[ci].category}"?`)) return;
    const cat = menu[ci];
    if (cat.id) await fetch(`/${slug}/api/menu`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: cat.id }) });
    setMenu(menu.filter((_, c) => c !== ci));
  };
  const openEdit = (ci: number, ii: number | null) => {
    setEditingItem({ catIdx: ci, itemIdx: ii });
    setDraft(ii === null ? { id: newId(), name: "", ingredients: "", price: 0, popular: false, spicy: false, vegetarian: false, active: true, image_url: "" } : { ...menu[ci].items[ii] });
  };
  const saveItem = () => {
    if (!draft.name.trim() || !editingItem) return;
    const { catIdx: ci, itemIdx: ii } = editingItem;
    const updated = menu.map((cat, c) => {
      if (c !== ci) return cat;
      return { ...cat, items: ii === null ? [...cat.items, draft] : cat.items.map((item, i) => i === ii ? draft : item) };
    });
    setMenu(updated); saveCategory(updated[ci]); setEditingItem(null);
  };
  const addCategory = () => {
    if (!newCatName.trim()) return;
    const newCat: MenuCategory = { category: newCatName.trim(), emoji: newCatEmoji, sort_order: menu.length, items: [] };
    const updated = [...menu, newCat];
    setMenu(updated);
    fetch(`/${slug}/api/menu`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify([newCat]) })
      .then(() => fetch(`/${slug}/api/menu`).then((r) => r.json()).then(setMenu));
    setNewCatName(""); setNewCatEmoji("🍕"); setShowNewCat(false);
  };

  return (
    <div className="tab-content">
      <div className="menu-toolbar">
        <span className="menu-toolbar__title">{menu.reduce((s, c) => s + c.items.length, 0)} prodotti · {menu.length} categorie</span>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {saved  && <span className="saved-badge">✓ Salvato</span>}
          {saving && <span className="saving-badge">Salvataggio…</span>}
          <button className="btn-add-cat" onClick={() => setShowNewCat(!showNewCat)}>+ Categoria</button>
        </div>
      </div>
      {showNewCat && (
        <div className="new-cat-form">
          <input value={newCatEmoji} onChange={(e) => setNewCatEmoji(e.target.value)} className="emoji-input" />
          <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Nome categoria" className="cat-name-input" onKeyDown={(e) => e.key === "Enter" && addCategory()} />
          <button className="btn-confirm" onClick={addCategory}>Aggiungi</button>
          <button className="btn-cancel" onClick={() => setShowNewCat(false)}>Annulla</button>
        </div>
      )}
      {menu.map((cat, ci) => (
        <div key={cat.id ?? cat.category} className="menu-section">
          <div className="menu-section__head">
            <h3 className="menu-section__title">{cat.emoji} {cat.category}</h3>
            <div style={{display:"flex",gap:6}}>
              <button className="btn-sm btn-sm--add" onClick={() => openEdit(ci, null)}>+ Prodotto</button>
              <button className="btn-sm btn-sm--del" onClick={() => deleteCategory(ci)}>🗑</button>
            </div>
          </div>
          <div className="menu-items-list">
            {cat.items.map((item, ii) => (
              <div key={item.id} className={`menu-item-row${!item.active ? " menu-item-row--inactive" : ""}`}>
                <div className="menu-item-row__main">
                  <span className="menu-item-row__name">{item.name}</span>
                  <div className="menu-item-row__flags">
                    {item.popular && <span className="flag">⭐</span>}
                    {item.spicy && <span className="flag">🌶</span>}
                    {item.vegetarian && <span className="flag">🌿</span>}
                    {!item.active && <span className="flag flag--off">OFF</span>}
                  </div>
                  <span className="menu-item-row__price">€{item.price.toFixed(2)}</span>
                </div>
                <p className="menu-item-row__ing">{item.ingredients}</p>
                <div className="menu-item-row__actions">
                  <button className="btn-sm btn-sm--edit" onClick={() => openEdit(ci, ii)}>✏️ Modifica</button>
                  <button className="btn-sm" onClick={() => toggleActive(ci, ii)}>{item.active ? "⏸ Disattiva" : "▶ Attiva"}</button>
                  <button className="btn-sm btn-sm--del" onClick={() => deleteItem(ci, ii)}>🗑</button>
                </div>
              </div>
            ))}
            {cat.items.length === 0 && <p className="empty-cat">Nessun prodotto.</p>}
          </div>
        </div>
      ))}
      {editingItem !== null && (
        <>
          <div className="modal-backdrop" onClick={() => setEditingItem(null)} />
          <div className="modal">
            <div className="modal__head">
              <h3>{editingItem.itemIdx === null ? "Nuovo prodotto" : "Modifica prodotto"}</h3>
              <button onClick={() => setEditingItem(null)}>✕</button>
            </div>
            <div className="modal__body">
              <label className="modal-field"><span>Nome *</span><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
              <label className="modal-field"><span>Ingredienti</span><textarea value={draft.ingredients} onChange={(e) => setDraft({ ...draft, ingredients: e.target.value })} rows={2} /></label>
              <label className="modal-field"><span>Descrizione breve</span><input value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label>
              <label className="modal-field"><span>Prezzo (€) *</span><input type="number" step="0.5" min="0" value={draft.price} onChange={(e) => setDraft({ ...draft, price: parseFloat(e.target.value) || 0 })} /></label>
              <div className="modal-field">
                <span>Foto prodotto</span>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  {draft.image_url && (
                    <img src={draft.image_url} alt="" style={{width:60,height:60,objectFit:"cover",borderRadius:8,border:"1px solid #EDE0CC",flexShrink:0}} />
                  )}
                  <label style={{padding:"8px 14px",background:"#F5EADA",border:"1.5px solid #EDE0CC",borderRadius:8,fontSize:".82rem",cursor:"pointer",fontFamily:"inherit"}}>
                    {uploadingItemImg ? "Caricamento…" : "📁 Carica foto"}
                    <input type="file" accept="image/*" style={{display:"none"}}
                      onChange={(e) => e.target.files?.[0] && uploadItemImage(e.target.files[0])} />
                  </label>
                  {draft.image_url && (
                    <button type="button" onClick={() => setDraft({...draft, image_url: ""})} style={{padding:"8px 12px",background:"transparent",border:"1px solid #EDE0CC",borderRadius:8,fontSize:".82rem",cursor:"pointer",color:"#7A7770"}}>Rimuovi</button>
                  )}
                </div>
              </div>
              <div className="modal-flags">
                {(["popular","spicy","vegetarian","active"] as const).map((flag) => (
                  <label key={flag} className="flag-toggle">
                    <input type="checkbox" checked={!!draft[flag]} onChange={(e) => setDraft({ ...draft, [flag]: e.target.checked })} />
                    <span>{{ popular:"⭐ Popolare", spicy:"🌶 Piccante", vegetarian:"🌿 Vegetariano", active:"✅ Attivo" }[flag]}</span>
                  </label>
                ))}
              </div>

              {/* ── PRODUCT OPTIONS ── */}
              <div className="modal-field">
                <span>Opzioni prodotto</span>

                {/* Sizes */}
                <div className="opt-section">
                  <label className="opt-section__toggle">
                    <input type="checkbox"
                      checked={!!draft.options?.sizes?.enabled}
                      onChange={(e) => setDraft((d) => ({ ...d, options: { ...d.options, sizes: { enabled: e.target.checked, items: d.options?.sizes?.items ?? [] } } }))}
                    />
                    <span>Taglie / Dimensioni</span>
                  </label>
                  {draft.options?.sizes?.enabled && (
                    <div className="opt-items">
                      {(draft.options.sizes.items).map((s, i) => (
                        <div key={i} className="opt-item-row">
                          <input className="opt-item-name" placeholder="es. Grande" value={s.name}
                            onChange={(e) => setDraft((d) => { const items = [...(d.options?.sizes?.items ?? [])]; items[i] = { ...s, name: e.target.value }; return { ...d, options: { ...d.options, sizes: { enabled: true, items } } }; })} />
                          <span className="opt-item-plus">+€</span>
                          <input className="opt-item-price" type="number" step="0.5" min="0" value={s.extra}
                            onChange={(e) => setDraft((d) => { const items = [...(d.options?.sizes?.items ?? [])]; items[i] = { ...s, extra: parseFloat(e.target.value) || 0 }; return { ...d, options: { ...d.options, sizes: { enabled: true, items } } }; })} />
                          <button type="button" className="opt-item-del"
                            onClick={() => setDraft((d) => ({ ...d, options: { ...d.options, sizes: { enabled: true, items: (d.options?.sizes?.items ?? []).filter((_, j) => j !== i) } } }))}>✕</button>
                        </div>
                      ))}
                      <button type="button" className="opt-add-btn"
                        onClick={() => setDraft((d) => ({ ...d, options: { ...d.options, sizes: { enabled: true, items: [...(d.options?.sizes?.items ?? []), { name: "", extra: 0 }] } } }))}>
                        + Aggiungi taglia
                      </button>
                    </div>
                  )}
                </div>

                {/* Ingredients */}
                <div className="opt-section">
                  <label className="opt-section__toggle">
                    <input type="checkbox"
                      checked={!!draft.options?.ingredients?.enabled}
                      onChange={(e) => setDraft((d) => ({ ...d, options: { ...d.options, ingredients: { enabled: e.target.checked, items: d.options?.ingredients?.items ?? [] } } }))}
                    />
                    <span>Ingredienti selezionabili</span>
                  </label>
                  {draft.options?.ingredients?.enabled && (
                    <div className="opt-items">
                      {(draft.options.ingredients.items).map((ing, i) => (
                        <div key={i} className="opt-item-row">
                          <input className="opt-item-name" placeholder="es. Funghi" value={ing.name}
                            onChange={(e) => setDraft((d) => { const items = [...(d.options?.ingredients?.items ?? [])]; items[i] = { ...ing, name: e.target.value }; return { ...d, options: { ...d.options, ingredients: { enabled: true, items } } }; })} />
                          <label className="opt-item-default">
                            <input type="checkbox" checked={ing.default_selected}
                              onChange={(e) => setDraft((d) => { const items = [...(d.options?.ingredients?.items ?? [])]; items[i] = { ...ing, default_selected: e.target.checked }; return { ...d, options: { ...d.options, ingredients: { enabled: true, items } } }; })} />
                            <span>di default</span>
                          </label>
                          <button type="button" className="opt-item-del"
                            onClick={() => setDraft((d) => ({ ...d, options: { ...d.options, ingredients: { enabled: true, items: (d.options?.ingredients?.items ?? []).filter((_, j) => j !== i) } } }))}>✕</button>
                        </div>
                      ))}
                      <button type="button" className="opt-add-btn"
                        onClick={() => setDraft((d) => ({ ...d, options: { ...d.options, ingredients: { enabled: true, items: [...(d.options?.ingredients?.items ?? []), { name: "", default_selected: true }] } } }))}>
                        + Aggiungi ingrediente
                      </button>
                    </div>
                  )}
                </div>

                {/* Extras */}
                <div className="opt-section">
                  <label className="opt-section__toggle">
                    <input type="checkbox"
                      checked={!!draft.options?.extras?.enabled}
                      onChange={(e) => setDraft((d) => ({ ...d, options: { ...d.options, extras: { enabled: e.target.checked, items: d.options?.extras?.items ?? [] } } }))}
                    />
                    <span>Extra aggiuntivi</span>
                  </label>
                  {draft.options?.extras?.enabled && (
                    <div className="opt-items">
                      {(draft.options.extras.items).map((ex, i) => (
                        <div key={i} className="opt-item-row">
                          <input className="opt-item-name" placeholder="es. Mozzarella extra" value={ex.name}
                            onChange={(e) => setDraft((d) => { const items = [...(d.options?.extras?.items ?? [])]; items[i] = { ...ex, name: e.target.value }; return { ...d, options: { ...d.options, extras: { enabled: true, items } } }; })} />
                          <span className="opt-item-plus">+€</span>
                          <input className="opt-item-price" type="number" step="0.5" min="0" value={ex.extra}
                            onChange={(e) => setDraft((d) => { const items = [...(d.options?.extras?.items ?? [])]; items[i] = { ...ex, extra: parseFloat(e.target.value) || 0 }; return { ...d, options: { ...d.options, extras: { enabled: true, items } } }; })} />
                          <button type="button" className="opt-item-del"
                            onClick={() => setDraft((d) => ({ ...d, options: { ...d.options, extras: { enabled: true, items: (d.options?.extras?.items ?? []).filter((_, j) => j !== i) } } }))}>✕</button>
                        </div>
                      ))}
                      <button type="button" className="opt-add-btn"
                        onClick={() => setDraft((d) => ({ ...d, options: { ...d.options, extras: { enabled: true, items: [...(d.options?.extras?.items ?? []), { name: "", extra: 0 }] } } }))}>
                        + Aggiungi extra
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal__foot">
              <button className="btn-cancel-modal" onClick={() => setEditingItem(null)}>Annulla</button>
              <button className="btn-save-modal" onClick={saveItem} disabled={!draft.name.trim()}>Salva</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── QR CODE CANVAS ────────────────────────────────────────
function QrCodeCanvas({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    import("qrcode").then((QRCode) => {
      QRCode.toCanvas(canvasRef.current!, value, {
        width: 180,
        margin: 2,
        color: { dark: "#1C1C1A", light: "#FFFFFF" },
      });
    });
  }, [value]);
  return <canvas ref={canvasRef} style={{ borderRadius: 8, display: "block" }} />;
}

// ─── TABLES TAB ────────────────────────────────────────────
function TablesTab({ slug }: { slug: string }) {
  const [tables, setTables]         = useState<KioskTable[]>([]);
  const [newName, setNewName]       = useState("");
  const [adding, setAdding]         = useState(false);
  const [origin, setOrigin]         = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch(`/${slug}/api/tables`).then((r) => r.json()).then(setTables).catch(() => {});
  }, [slug]);

  const addTable = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/${slug}/api/tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (data.id) { setTables((prev) => [...prev, data]); setNewName(""); }
    } finally { setAdding(false); }
  };

  const deleteTable = async (id: string) => {
    if (!confirm("Eliminare questo tavolo? Il QR code non funzionerà più.")) return;
    await fetch(`/${slug}/api/tables/${id}`, { method: "DELETE" });
    setTables((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="tab-content">
      <div className="settings-card">
        <div className="settings-card__head">
          <div>
            <h3 className="settings-card__title">Aggiungi tavolo</h3>
            <p className="settings-card__sub">Ogni tavolo ottiene un QR code univoco per il kiosk</p>
          </div>
        </div>
        <div style={{ padding: "12px 20px 16px", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTable()}
            placeholder="Es. Tavolo 1, Bancone, Terrazza…"
            style={{ flex: 1, minWidth: 200, padding: "9px 14px", border: "1.5px solid #EDE0CC", borderRadius: 8, fontSize: ".9rem", fontFamily: "inherit", outline: "none" }}
          />
          <button onClick={addTable} disabled={adding || !newName.trim()} className="btn-save-hours">
            {adding ? "Aggiunta…" : "+ Aggiungi tavolo"}
          </button>
        </div>
      </div>

      {tables.length === 0 ? (
        <div className="empty-state">
          <span>🪑</span>
          <p>Nessun tavolo configurato</p>
          <small>Aggiungi i tavoli per generare i QR code del kiosk</small>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
          {tables.map((table) => {
            const kioskUrl = `${origin}/${slug}/kiosk?table=${table.token}`;
            return (
              <div key={table.id} style={{ background: "#fff", border: "1px solid #EDE0CC", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 14, alignItems: "center", boxShadow: "0 2px 12px rgba(28,28,26,.07)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                  <div>
                    <p style={{ fontFamily: "Georgia,serif", fontSize: "1rem", fontWeight: 700, color: "#1C1C1A" }}>🪑 {table.name}</p>
                    <p style={{ fontSize: ".68rem", color: "#B0ACA5", marginTop: 2, fontFamily: "monospace" }}>{table.token.slice(0, 16)}…</p>
                  </div>
                  <button onClick={() => deleteTable(table.id)}
                    style={{ padding: "6px 10px", background: "transparent", border: "1px solid #FFCDD2", borderRadius: 8, fontSize: ".75rem", cursor: "pointer", color: "#B71C1C" }}>
                    🗑 Elimina
                  </button>
                </div>
                {origin && <QrCodeCanvas value={kioskUrl} />}
                <p style={{ fontSize: ".7rem", color: "#7A7770", textAlign: "center", wordBreak: "break-all", lineHeight: 1.4, width: "100%" }}>{kioskUrl}</p>
                <button onClick={() => navigator.clipboard.writeText(kioskUrl)}
                  style={{ width: "100%", padding: "8px", background: "#F5EADA", border: "1px solid #EDE0CC", borderRadius: 8, fontSize: ".82rem", cursor: "pointer", color: "#3A3A36", fontFamily: "inherit" }}>
                  📋 Copia link
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ROOT PAGE ──────────────────────────────────────────────
export default function ShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: urlSlug } = use(params);

  const [user, setUser] = useState<StaffUser | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("shop_user");
      if (stored) setUser(JSON.parse(stored));
    } catch {}
  }, []);
  const [tab, setTab] = useState<"orders" | "menu" | "settings" | "tables">("orders");
  const [activeSlug, setActiveSlug] = useState(urlSlug);
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/${activeSlug}/api/settings`)
      .then((r) => r.json())
      .then((d) => { if (d.subscription_expires_at) setSubscriptionExpiresAt(d.subscription_expires_at); })
      .catch(() => {});
  }, [activeSlug]);

  const subscriptionWarning = (() => {
    if (!subscriptionExpiresAt || !user || user.role !== "admin") return null;
    const exp = new Date(subscriptionExpiresAt);
    const daysLeft = Math.ceil((exp.getTime() - Date.now()) / 86400000);
    if (daysLeft > 30) return null;
    if (daysLeft <= 0) return { msg: "Il tuo abbonamento è scaduto. Contatta il supporto per rinnovarlo.", color: "#B03A2E", bg: "#FDECEA", border: "#F5B4AD" };
    return { msg: `L'abbonamento scade tra ${daysLeft} giorn${daysLeft === 1 ? "o" : "i"} (${exp.toLocaleDateString("it-IT")}). Rinnova presto!`, color: "#8A5E12", bg: "#FEF3DB", border: "#F9DC7D" };
  })();

  const handleLogin = (u: StaffUser) => {
    setUser(u);
    setActiveSlug(urlSlug);
    setTab("orders");
  };
  const logout = () => { localStorage.removeItem("shop_user"); setUser(null); };

  const switchBusiness = (s: string) => {
    setActiveSlug(s);
    setTab("orders");
    setSubscriptionExpiresAt(null);
  };

  if (!user) return (
    <>
      <LoginScreen onLogin={handleLogin} slug={urlSlug} />
      <style>{styles}</style>
    </>
  );

  const roleBadge: Record<StaffRole, string> = {
    reception: "🧑‍💼 Receptionist",
    delivery:  "🛵 Fattorino",
    admin:     "👑 Admin",
  };

  const multiBusinesses = user.role === "admin" && user.businesses && user.businesses.length > 1
    ? user.businesses
    : null;

  return (
    <div className="shop">
      <header className="shop__header">
        <div className="shop__header-inner">
          <div className="shop__logo-wrap">
            <span className="shop__logo">🍕 Dashboard</span>
            <span className="role-badge">{roleBadge[user.role]}</span>
          </div>
          <nav className="shop__tabs">
            <button className={`shop__tab${tab === "orders" ? " shop__tab--active" : ""}`} onClick={() => setTab("orders")}>📋 Ordini</button>
            {user.role === "admin" && (
              <>
                <button className={`shop__tab${tab === "menu" ? " shop__tab--active" : ""}`} onClick={() => setTab("menu")}>🍕 Menu</button>
                <button className={`shop__tab${tab === "tables" ? " shop__tab--active" : ""}`} onClick={() => setTab("tables")}>🪑 Tavoli</button>
                <button className={`shop__tab${tab === "settings" ? " shop__tab--active" : ""}`} onClick={() => setTab("settings")}>⚙️ Impostazioni</button>
              </>
            )}
            <button className="shop__tab shop__tab--logout" onClick={logout}>🚪 Esci</button>
          </nav>
        </div>
        {multiBusinesses && (
          <div className="shop__biz-switcher">
            {multiBusinesses.map((b) => (
              <button
                key={b.slug}
                className={`biz-tab${activeSlug === b.slug ? " biz-tab--active" : ""}`}
                onClick={() => switchBusiness(b.slug)}
              >
                {b.name}
              </button>
            ))}
          </div>
        )}
      </header>
      {subscriptionWarning && (
        <div style={{background:subscriptionWarning.bg,borderBottom:`1px solid ${subscriptionWarning.border}`,padding:"10px 20px",fontSize:".83rem",fontWeight:500,color:subscriptionWarning.color,textAlign:"center"}}>
          ⚠️ {subscriptionWarning.msg}
        </div>
      )}
      <main className="shop__main">
        {tab === "orders"   && <OrdersTab role={user.role} slug={activeSlug} />}
        {tab === "menu"     && user.role === "admin" && <MenuTab slug={activeSlug} />}
        {tab === "tables"   && user.role === "admin" && <TablesTab slug={activeSlug} />}
        {tab === "settings" && user.role === "admin" && <SettingsTab slug={activeSlug} />}
      </main>
      <style>{styles}</style>
    </div>
  );
}

const styles = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;background:#F5EADA;min-height:100vh}
.login{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#1C1C1A;padding:24px}
.login__card{background:#FDF6EC;border-radius:20px;padding:40px 32px;width:100%;max-width:360px;display:flex;flex-direction:column;gap:14px;box-shadow:0 20px 60px rgba(0,0,0,.4);align-items:center}
.login__logo{font-size:2.5rem}
.login__title{font-family:Georgia,serif;font-size:1.6rem;font-weight:700;color:#1C1C1A}
.login__sub{font-size:.82rem;color:#7A7770;margin-top:-6px}
.login__input{padding:12px 16px;border:1.5px solid #EDE0CC;border-radius:10px;font-size:.95rem;width:100%;outline:none;font-family:inherit}
.login__input:focus{border-color:#B03A2E}
.login__btn{padding:13px;background:#B03A2E;color:#fff;border:none;border-radius:10px;font-size:.95rem;font-weight:500;cursor:pointer;width:100%;transition:background .15s}
.login__btn:hover:not(:disabled){background:#C9503F}
.login__btn:disabled{opacity:.6;cursor:wait}
.login__err{font-size:.8rem;color:#B03A2E;text-align:center}
.shop__header{background:#1C1C1A;position:sticky;top:0;z-index:10;box-shadow:0 2px 12px rgba(0,0,0,.2)}
.shop__header-inner{max-width:1200px;margin:0 auto;padding:0 20px;display:flex;align-items:center;gap:12px;min-height:56px;flex-wrap:wrap}
.shop__logo-wrap{display:flex;align-items:center;gap:10px;flex:1;min-width:0}
.shop__logo{font-family:Georgia,serif;font-size:1.05rem;font-weight:700;color:#FDF6EC;white-space:nowrap}
.role-badge{font-size:.7rem;font-weight:500;padding:3px 9px;border-radius:999px;background:rgba(253,246,236,.12);color:rgba(253,246,236,.7);white-space:nowrap}
.shop__tabs{display:flex;gap:4px;flex-wrap:wrap}
.shop__tab{padding:6px 12px;background:rgba(253,246,236,.08);border:none;color:rgba(253,246,236,.6);border-radius:8px;cursor:pointer;font-size:.8rem;font-weight:500;transition:background .15s,color .15s;white-space:nowrap}
.shop__tab:hover{background:rgba(253,246,236,.15);color:#FDF6EC}
.shop__tab--active{background:rgba(253,246,236,.18);color:#FDF6EC}
.shop__tab--logout{color:rgba(255,100,80,.7)}
.shop__tab--logout:hover{background:rgba(255,100,80,.12);color:#ff6450}
.shop__biz-switcher{display:flex;gap:4px;padding:0 20px 10px;max-width:1200px;margin:0 auto;flex-wrap:wrap}
.biz-tab{padding:5px 14px;background:rgba(253,246,236,.1);border:1px solid rgba(253,246,236,.15);color:rgba(253,246,236,.55);border-radius:999px;cursor:pointer;font-size:.78rem;font-weight:500;transition:all .15s;white-space:nowrap}
.biz-tab:hover{background:rgba(253,246,236,.18);color:#FDF6EC}
.biz-tab--active{background:rgba(176,58,46,.7);border-color:rgba(176,58,46,.8);color:#FDF6EC}
.shop__main{max-width:1200px;margin:0 auto;padding:20px}
.tab-content{display:flex;flex-direction:column;gap:16px}
.orders-stats{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.stat-pill{font-size:.75rem;font-weight:500;padding:5px 12px;border-radius:999px}
.stat-pill--new{background:#FEF3DB;color:#8A5E12}
.stat-pill--ready{background:#EBF5EB;color:#1B5E20}
.shop__live{font-size:.72rem;color:#4CAF50;font-weight:500;margin-left:auto;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.empty-state{display:flex;flex-direction:column;align-items:center;gap:8px;padding:80px 20px;text-align:center;color:#7A7770}
.empty-state span{font-size:2.5rem}
.empty-state p{font-size:1rem;font-weight:500;color:#1C1C1A}
.orders-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
.order-card{background:#fff;border:2px solid #EDE0CC;border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:10px;box-shadow:0 2px 12px rgba(28,28,26,.07)}
.order-card--ready{border-color:#4CAF50;background:#F1F8F1}
.order-card__head{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
.order-id{font-size:.7rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#7A7770;display:block;margin-bottom:4px}
.status-badge{font-size:.7rem;font-weight:500;padding:3px 10px;border-radius:999px;background:#FEF3DB;color:#8A5E12}
.status-badge--ready{background:#EBF5EB;color:#1B5E20}
.order-time{font-size:.75rem;color:#B0ACA5;white-space:nowrap}
.order-client{display:flex;flex-direction:column;gap:3px}
.order-client__name{font-size:.95rem;font-weight:600;color:#1C1C1A}
.order-client__link{font-size:.82rem;color:#3A3A36;text-decoration:none;transition:color .15s}
.order-client__link:hover{color:#B03A2E}
.order-items{list-style:none;display:flex;flex-direction:column;gap:3px}
.order-item{display:flex;align-items:baseline;gap:6px;font-size:.87rem}
.order-item__qty{font-weight:700;color:#B03A2E;min-width:20px}
.order-item__name{flex:1;color:#1C1C1A}
.order-item__price{color:#7A7770;white-space:nowrap}
.order-total{display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px solid #EDE0CC;font-size:.82rem;font-weight:500;color:#7A7770}
.order-total__amt{font-family:Georgia,serif;font-size:1.15rem;font-weight:700;color:#1C1C1A}
.order-actions{display:flex;gap:8px;flex-wrap:wrap}
.action-btn{flex:1;padding:10px;border:none;border-radius:10px;font-size:.85rem;font-weight:500;cursor:pointer;transition:opacity .15s,transform .15s;min-width:120px}
.action-btn:hover{opacity:.88;transform:translateY(-1px)}
.action-btn--ready{background:#4CAF50;color:#fff}
.action-btn--delivered{background:#1C1C1A;color:#FDF6EC}
.settings-card{background:#fff;border:1px solid #EDE0CC;border-radius:14px;overflow:hidden}
.settings-card__head{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;gap:12px;flex-wrap:wrap}
.settings-card__title{font-family:Georgia,serif;font-size:1rem;font-weight:700;color:#1C1C1A;margin-bottom:3px}
.settings-card__sub{font-size:.78rem;color:#7A7770}
.settings-card__warning{padding:12px 20px;background:#FFF3CD;border-top:1px solid #FFE082;font-size:.82rem;color:#7A5200;font-weight:500}
.toggle-btn{display:flex;align-items:center;gap:8px;padding:10px 16px;border:none;border-radius:999px;cursor:pointer;font-size:.88rem;font-weight:500;transition:background .2s;flex-shrink:0}
.toggle-btn--on{background:#EBF5EB;color:#1B5E20}
.toggle-btn--off{background:#FDECEA;color:#B71C1C}
.toggle-btn__dot{width:10px;height:10px;border-radius:50%;background:currentColor}
.btn-save-hours{padding:8px 16px;background:#B03A2E;color:#fff;border:none;border-radius:8px;font-size:.82rem;font-weight:500;cursor:pointer}
.hours-editor{padding:8px 20px 16px;display:flex;flex-direction:column;gap:6px}
.hours-row-edit{display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid #F5EADA}
.hours-row-edit:last-child{border-bottom:none}
.hours-day-toggle{display:flex;align-items:center;gap:8px;cursor:pointer;min-width:130px}
.hours-day-toggle input{width:16px;height:16px;accent-color:#B03A2E;cursor:pointer;flex-shrink:0}
.hours-day-name{font-size:.88rem;font-weight:500;color:#1C1C1A}
.hours-times{display:flex;align-items:center;gap:6px}
.time-input{padding:6px 10px;border:1.5px solid #EDE0CC;border-radius:8px;font-size:.85rem;font-family:inherit;color:#1C1C1A}
.time-input:focus{outline:none;border-color:#B03A2E}
.hours-sep{color:#7A7770;font-size:.85rem}
.hours-closed{font-size:.8rem;font-weight:500;color:#B03A2E;text-transform:uppercase;letter-spacing:.06em}
.saved-badge{font-size:.78rem;font-weight:500;color:#2E7D32;background:#EBF5EB;padding:4px 10px;border-radius:999px}
.saving-badge{font-size:.78rem;color:#7A7770}
.menu-toolbar{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#fff;border:1px solid #EDE0CC;border-radius:12px;flex-wrap:wrap;gap:8px}
.menu-toolbar__title{font-size:.85rem;color:#7A7770}
.btn-add-cat{padding:8px 14px;background:#1C1C1A;color:#FDF6EC;border:none;border-radius:8px;font-size:.82rem;font-weight:500;cursor:pointer}
.new-cat-form{display:flex;gap:8px;align-items:center;padding:14px 16px;background:#fff;border:1px solid #EDE0CC;border-radius:12px;flex-wrap:wrap}
.emoji-input{width:50px;padding:8px;border:1.5px solid #EDE0CC;border-radius:8px;font-size:1.2rem;text-align:center}
.cat-name-input{flex:1;min-width:160px;padding:9px 12px;border:1.5px solid #EDE0CC;border-radius:8px;font-size:.9rem}
.cat-name-input:focus,.emoji-input:focus,.time-input:focus{outline:none;border-color:#B03A2E}
.btn-confirm{padding:9px 16px;background:#B03A2E;color:#fff;border:none;border-radius:8px;font-size:.85rem;font-weight:500;cursor:pointer}
.btn-cancel{padding:9px 16px;background:transparent;color:#7A7770;border:1px solid #EDE0CC;border-radius:8px;font-size:.85rem;cursor:pointer}
.menu-section{background:#fff;border:1px solid #EDE0CC;border-radius:12px;overflow:hidden}
.menu-section__head{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#F5EADA;border-bottom:1px solid #EDE0CC;flex-wrap:wrap;gap:8px}
.menu-section__title{font-family:Georgia,serif;font-size:1rem;font-weight:700;color:#1C1C1A}
.btn-sm{padding:5px 10px;border:1px solid #EDE0CC;background:#fff;border-radius:6px;font-size:.75rem;cursor:pointer;white-space:nowrap;transition:background .15s}
.btn-sm:hover{background:#F5EADA}
.btn-sm--add{border-color:#B03A2E;color:#B03A2E}.btn-sm--add:hover{background:#FFF0EE}
.btn-sm--del{border-color:#ffcdd2;color:#B71C1C}.btn-sm--del:hover{background:#ffebee}
.btn-sm--edit{border-color:#B0BEC5;color:#455A64}
.menu-items-list{display:flex;flex-direction:column}
.menu-item-row{padding:12px 16px;border-bottom:1px solid #F5EADA;display:flex;flex-direction:column;gap:4px}
.menu-item-row:last-child{border-bottom:none}
.menu-item-row:hover{background:#FAFAF8}
.menu-item-row--inactive{opacity:.5}
.menu-item-row__main{display:flex;align-items:center;gap:8px}
.menu-item-row__name{font-size:.9rem;font-weight:500;color:#1C1C1A;flex:1}
.menu-item-row__flags{display:flex;gap:4px}
.flag{font-size:.75rem}
.flag--off{font-size:.65rem;font-weight:700;background:#FDECEA;color:#B71C1C;padding:2px 5px;border-radius:4px}
.menu-item-row__price{font-size:.88rem;font-weight:500;color:#1C1C1A;white-space:nowrap}
.menu-item-row__ing{font-size:.78rem;color:#7A7770;line-height:1.3}
.menu-item-row__actions{display:flex;gap:6px;flex-wrap:wrap}
.empty-cat{font-size:.8rem;color:#B0ACA5;padding:12px 16px;font-style:italic}
.modal-backdrop{position:fixed;inset:0;z-index:200;background:rgba(28,28,26,.5);backdrop-filter:blur(2px)}
.modal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:201;background:#fff;border-radius:16px;padding:0;width:90%;max-width:440px;box-shadow:0 20px 60px rgba(0,0,0,.2);max-height:90vh;overflow-y:auto}
.modal__head{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #EDE0CC}
.modal__head h3{font-family:Georgia,serif;font-size:1rem;font-weight:700;color:#1C1C1A}
.modal__head button{background:rgba(28,28,26,.08);border:none;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:.85rem;display:flex;align-items:center;justify-content:center}
.modal__body{padding:16px 20px;display:flex;flex-direction:column;gap:12px}
.modal-field{display:flex;flex-direction:column;gap:4px;font-size:.82rem;font-weight:500;color:#7A7770}
.modal-field input,.modal-field textarea{padding:9px 12px;border:1.5px solid #EDE0CC;border-radius:8px;font-size:.9rem;font-family:inherit;resize:vertical}
.modal-field input:focus,.modal-field textarea:focus{outline:none;border-color:#B03A2E}
.modal-flags{display:flex;flex-wrap:wrap;gap:8px}
.flag-toggle{display:flex;align-items:center;gap:6px;font-size:.82rem;color:#3A3A36;cursor:pointer}
.flag-toggle input{width:15px;height:15px;accent-color:#B03A2E}
.modal__foot{display:flex;gap:8px;padding:14px 20px;border-top:1px solid #EDE0CC;justify-content:flex-end}
.btn-cancel-modal{padding:9px 18px;background:transparent;color:#7A7770;border:1px solid #EDE0CC;border-radius:8px;font-size:.85rem;cursor:pointer}
.btn-save-modal{padding:9px 18px;background:#B03A2E;color:#fff;border:none;border-radius:8px;font-size:.85rem;font-weight:500;cursor:pointer}
.btn-save-modal:disabled{opacity:.5;cursor:not-allowed}
.order-notes{display:flex;gap:6px;align-items:flex-start;padding:8px 10px;background:#FFFDE7;border:1px solid #FFE082;border-radius:8px;font-size:.83rem;color:#5D4037;line-height:1.4}
.order-card--kiosk{border-left:4px solid #1565C0}
.kiosk-badge{font-size:.62rem;font-weight:700;padding:2px 7px;border-radius:999px;background:#E3F2FD;color:#1565C0;margin-left:5px;vertical-align:middle}
.order-client__table{font-size:.88rem;font-weight:600;color:#1565C0}
.opt-section{margin-top:10px;background:#F9F5EE;border:1px solid #EDE0CC;border-radius:8px;padding:10px 12px}
.opt-section__toggle{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:.88rem;font-weight:500;color:#1C1C1A}
.opt-section__toggle input{width:16px;height:16px;accent-color:#B03A2E;cursor:pointer;flex-shrink:0}
.opt-items{margin-top:10px;display:flex;flex-direction:column;gap:6px}
.opt-item-row{display:flex;align-items:center;gap:6px}
.opt-item-name{flex:1;padding:6px 8px;border:1.5px solid #EDE0CC;border-radius:6px;font-size:.82rem;font-family:inherit;outline:none}
.opt-item-name:focus{border-color:#B03A2E}
.opt-item-plus{font-size:.78rem;color:#7A7770;white-space:nowrap;flex-shrink:0}
.opt-item-price{width:60px;padding:6px 8px;border:1.5px solid #EDE0CC;border-radius:6px;font-size:.82rem;font-family:inherit;text-align:center;outline:none}
.opt-item-price:focus{border-color:#B03A2E}
.opt-item-del{background:transparent;border:none;cursor:pointer;color:#B03A2E;font-size:.85rem;padding:4px;flex-shrink:0}
.opt-item-default{display:flex;align-items:center;gap:4px;font-size:.75rem;color:#7A7770;white-space:nowrap;cursor:pointer;flex-shrink:0}
.opt-item-default input{width:14px;height:14px;accent-color:#B03A2E;cursor:pointer}
.opt-add-btn{background:transparent;border:1px dashed #EDE0CC;border-radius:6px;padding:5px 10px;font-size:.78rem;color:#7A7770;cursor:pointer;font-family:inherit;transition:border-color .15s,color .15s;text-align:left;width:fit-content}
.opt-add-btn:hover{border-color:#B03A2E;color:#B03A2E}
`;
