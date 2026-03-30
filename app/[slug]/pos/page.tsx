"use client";
import { use, useEffect, useState, useCallback, useMemo, useRef } from "react";
import { supabase } from "../../../lib/supabase";
import type { StaffUser, KioskTable, Order, OrderItem, MenuCategory, MenuItem, StaffRole, WeekHours, DayHours, DeliveryShift } from "../../../lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const eur    = (n: number) => "€ " + n.toFixed(2).replace(".", ",");
const newId  = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const elapsed = (iso: string) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "adesso"; if (mins === 1) return "1 min fa"; return `${mins} min fa`;
};
const DAY_LABELS: Record<string, string> = {
  monday:"Lunedì", tuesday:"Martedì", wednesday:"Mercoledì",
  thursday:"Giovedì", friday:"Venerdì", saturday:"Sabato", sunday:"Domenica",
};
const DAY_KEYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

const BP_CAT: Record<string, string> = {
  "1":"Caffetteria","2":"Bibite","3":"Birra","4":"Gin / Tequila",
  "5":"Whisky","6":"Vodka","7":"Amaro","8":"Vino","9":"Liquori",
  "10":"Cognac","11":"Rum","12":"Long Drinks","13":"Cocktail","14":"Shots","0":"Varie",
};
function catLabel(c: string) {
  if (c.startsWith("bp_"))   return BP_CAT[c.slice(3)] ?? `Cat. ${c.slice(3)}`;
  if (c.startsWith("menu_")) return c.slice(5);
  return c;
}
function calcTotals(cart: CartItem[]) {
  const total = cart.reduce((s, c) => s + c.article.price * c.qty, 0);
  const vatByRate: Record<number, number> = {};
  for (const c of cart) {
    const r = c.article.vat_rate;
    vatByRate[r] = (vatByRate[r] ?? 0) + (c.article.price * c.qty) * r / (100 + r);
  }
  const vat_amount = Object.values(vatByRate).reduce((s, v) => s + v, 0);
  return { total, subtotal: total - vat_amount, vat_amount, vatByRate };
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Article  = { id: string; code: string; name: string; price: number; category: string; vat_rate: number; };
type CartItem = { article: Article; qty: number; };
type InvItem  = { id: string; article_name: string; quantity: number; unit_price: number; vat_rate: number; total_price: number; };
type OpenInv  = { id: string; table_id: string | null; total: number; invoice_items?: InvItem[]; };
type PosTab   = "cassa" | "orders" | "menu" | "tables" | "settings" | "shifts" | "shift";

// ─── Login ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, slug }: { onLogin: (u: StaffUser) => void; slug: string }) {
  const [u, setU] = useState(""); const [p, setP] = useState("");
  const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);
  const login = async () => {
    if (!u || !p) return; setLoading(true); setErr("");
    try {
      const res = await fetch(`/${slug}/api/auth`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ username:u, password:p }) });
      const d = await res.json();
      if (!res.ok) setErr(d.error ?? "Errore");
      else { const user = { ...d.user, businesses: d.businesses ?? [] }; localStorage.setItem("shop_user", JSON.stringify(user)); onLogin(user); }
    } catch { setErr("Errore di connessione"); } finally { setLoading(false); }
  };
  const S: React.CSSProperties = { width:"100%", background:"#0f172a", border:"1px solid #334155", borderRadius:8, padding:"10px 14px", color:"#f1f5f9", fontSize:15, marginBottom:12, boxSizing:"border-box" };
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#0f172a" }}>
      <div style={{ background:"#1e293b", borderRadius:16, padding:40, width:340, boxShadow:"0 25px 50px #0008" }}>
        <div style={{ fontSize:48, textAlign:"center", marginBottom:8 }}>🍕</div>
        <h1 style={{ color:"#f1f5f9", textAlign:"center", fontSize:22, fontWeight:700, margin:"0 0 24px" }}>La Piazzetta</h1>
        <input style={S} placeholder="Username" value={u} autoFocus onChange={e=>setU(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} />
        <input style={S} placeholder="Password" type="password" value={p} onChange={e=>setP(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} />
        <button onClick={login} disabled={loading} style={{ width:"100%", background:"#2563eb", color:"#fff", border:"none", borderRadius:8, padding:"12px 0", fontSize:15, fontWeight:600, cursor:"pointer" }}>
          {loading ? "Accesso…" : "Accedi"}
        </button>
        {err && <p style={{ color:"#f87171", textAlign:"center", marginTop:12, fontSize:13 }}>{err}</p>}
      </div>
    </div>
  );
}

// ─── ORDERS TAB ───────────────────────────────────────────────────────────────
function OrdersTab({ role, slug, activeShift, onShiftUpdated, staffUser }: {
  role: StaffRole; slug: string; activeShift?: DeliveryShift | null;
  onShiftUpdated?: () => void; staffUser?: StaffUser | null;
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [, setTick] = useState(0);
  const [pendingHandovers, setPendingHandovers] = useState<DeliveryShift[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const fetchOrders = useCallback(async () => {
    const res = await fetch(`/${slug}/api/orders`); setOrders(await res.json());
  }, [slug]);
  const fetchHandovers = useCallback(async () => {
    if (role !== "reception" && role !== "admin") return;
    const res = await fetch(`/${slug}/api/shifts?status=pending_handover`);
    if (res.ok) setPendingHandovers(await res.json());
  }, [slug, role]);
  useEffect(() => {
    fetchOrders(); fetchHandovers();
    const channel = supabase.channel(`orders-rt-${slug}`)
      .on("postgres_changes", { event:"*", schema:"public", table:"orders" }, fetchOrders).subscribe();
    const tick = setInterval(() => setTick((t) => t + 1), 30000);
    return () => { supabase.removeChannel(channel); clearInterval(tick); };
  }, [fetchOrders, fetchHandovers, slug]);
  const markReady     = async (id: string) => { await fetch(`/${slug}/api/order/${id}`, { method:"PATCH" }); };
  const markDelivered = async (id: string) => {
    const order = orders.find((o) => o.id === id);
    await fetch(`/${slug}/api/order/${id}`, { method:"DELETE" });
    if (activeShift && order && order.order_type !== "kiosk") {
      await fetch(`/${slug}/api/shifts/${activeShift.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action:"add_delivery", amount:order.total }) });
      onShiftUpdated?.();
    }
  };
  const confirmHandover = async (shiftId: string) => {
    setConfirmingId(shiftId);
    await fetch(`/${slug}/api/shifts/${shiftId}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action:"confirm", confirmedBy: staffUser?.name ?? "reception" }) });
    setConfirmingId(null); fetchHandovers();
  };
  const visible     = orders.filter((o) => role === "delivery" ? o.status === "ready" : true);
  const newOrders   = orders.filter((o) => o.status === "new");
  const readyOrders = orders.filter((o) => o.status === "ready");
  return (
    <div className="tab-content">
      {pendingHandovers.map((shift) => (
        <div key={shift.id} className="handover-banner">
          <div>
            <p className="handover-banner__title">💰 {shift.staff_name} ha chiuso il turno</p>
            <p className="handover-banner__sub">Fondo cassa €{shift.initial_float.toFixed(2)} + incassi €{shift.total_collected.toFixed(2)} = <strong>€{(shift.initial_float + shift.total_collected).toFixed(2)}</strong> da ritirare</p>
          </div>
          <button className="action-btn action-btn--ready" onClick={() => confirmHandover(shift.id)} disabled={confirmingId === shift.id} style={{ whiteSpace:"nowrap", flexShrink:0 }}>
            {confirmingId === shift.id ? "Conferma…" : "✅ Confermo incasso"}
          </button>
        </div>
      ))}
      <div className="orders-stats">
        {role !== "delivery" && <span className="stat-pill stat-pill--new">🆕 {newOrders.length} nuovi</span>}
        <span className="stat-pill stat-pill--ready">✅ {readyOrders.length} pronti</span>
        <span className="shop__live">● Real-time</span>
      </div>
      {visible.length === 0 ? (
        <div className="empty-state"><span>{role === "delivery" ? "🛵" : "🍃"}</span><p>{role === "delivery" ? "Nessuna consegna pronta" : "Nessun ordine attivo"}</p><small>{role === "delivery" ? "Gli ordini pronti appariranno qui" : "Gli ordini appariranno automaticamente"}</small></div>
      ) : (
        <div className="orders-grid">
          {visible.map((order) => (
            <div key={order.id} className={`order-card${order.status==="ready"?" order-card--ready":""}${order.order_type==="kiosk"?" order-card--kiosk":""}`}>
              <div className="order-card__head">
                <div>
                  <span className="order-id">#{order.id}</span>
                  <span className={`status-badge${order.status==="ready"?" status-badge--ready":""}`}>{order.status==="new"?"Nuovo":"Pronto"}</span>
                  {order.order_type==="kiosk" && <span className="kiosk-badge">🪑 Kiosk</span>}
                </div>
                <span className="order-time">{elapsed(order.placed_at)}</span>
              </div>
              <div className="order-client">
                <p className="order-client__name">{order.client_name}</p>
                {order.order_type==="kiosk" ? <span className="order-client__table">🪑 {order.table_name}</span> : (
                  <>{order.phone && <a href={`tel:${order.phone}`} className="order-client__link">📞 {order.phone}</a>}
                  <a href={order.lat ? `https://maps.google.com/?q=${order.lat},${order.lng}` : `https://maps.google.com/?q=${encodeURIComponent(order.address)}`} target="_blank" rel="noopener noreferrer" className="order-client__link">📍 {order.address}</a></>
                )}
              </div>
              <ul className="order-items">
                {order.items.filter((it) => it.id !== "_notes_").map((item) => (
                  <li key={item.id} className="order-item"><span className="order-item__qty">{item.qty}×</span><span className="order-item__name">{item.name}</span><span className="order-item__price">€{(item.price*item.qty).toFixed(2)}</span></li>
                ))}
              </ul>
              {order.items.find((it) => it.id === "_notes_") && (
                <div className="order-notes"><span>📝</span><span>{order.items.find((it) => it.id === "_notes_")!.name}</span></div>
              )}
              <div className="order-total"><span>Totale</span><span className="order-total__amt">€{order.total.toFixed(2)}</span></div>
              <div className="order-actions">
                {order.status==="new" && role!=="delivery" && <button className="action-btn action-btn--ready" onClick={() => markReady(order.id)}>✅ Ordine pronto</button>}
                {order.status==="ready" && role!=="reception" && <button className="action-btn action-btn--delivered" onClick={() => markDelivered(order.id)}>{order.order_type==="kiosk"?"🪑 Servito al tavolo":"🛵 Consegnato"}</button>}
                {order.status==="ready" && role==="admin" && <button className="action-btn action-btn--ready" onClick={() => markReady(order.id)} style={{background:"#888"}}>↩ Rimetti nuovo</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SETTINGS TAB ─────────────────────────────────────────────────────────────
function SettingsTab({ slug }: { slug: string }) {
  const [onlineOrders, setOnlineOrders] = useState(true);
  const [hours, setHours]               = useState<WeekHours | null>(null);
  const [deliveryFee, setDeliveryFee]   = useState("0");
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
    await fetch(`/${slug}/api/settings`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ key, value }) });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };
  const updateDay = (day: string, field: keyof DayHours, val: unknown) => {
    setHours((prev) => { if (!prev) return prev; return { ...prev, [day]: { ...prev[day as keyof WeekHours], [field]: val } }; });
  };
  return (
    <div className="tab-content">
      <div className="settings-card">
        <div className="settings-card__head">
          <div><h3 className="settings-card__title">Ordini online</h3><p className="settings-card__sub">Disattiva per bloccare nuovi ordini dal sito</p></div>
          <button className={`toggle-btn${onlineOrders?" toggle-btn--on":" toggle-btn--off"}`} onClick={() => { const next=!onlineOrders; setOnlineOrders(next); saveSetting("online_orders",next); }}>
            <span className="toggle-btn__dot"/><span className="toggle-btn__label">{onlineOrders?"Attivi":"Disattivi"}</span>
          </button>
        </div>
        {!onlineOrders && <div className="settings-card__warning">⚠️ Gli ordini online sono disattivati.</div>}
      </div>
      <div className="settings-card">
        <div className="settings-card__head">
          <div><h3 className="settings-card__title">Costo di consegna</h3><p className="settings-card__sub">Aggiunto automaticamente ad ogni ordine</p></div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,border:"1.5px solid #EDE0CC",borderRadius:8,padding:"6px 10px",background:"#fff"}}>
              <span style={{fontSize:".85rem",color:"#7A7770"}}>€</span>
              <input type="number" min="0" step="0.50" value={deliveryFee} onChange={(e)=>setDeliveryFee(e.target.value)} style={{width:64,border:"none",outline:"none",fontSize:".9rem",fontFamily:"inherit"}}/>
            </div>
            <button className="btn-save-hours" onClick={()=>saveSetting("delivery_fee",parseFloat(deliveryFee)||0)}>Salva</button>
          </div>
        </div>
      </div>
      <div className="settings-card">
        <div className="settings-card__head">
          <div><h3 className="settings-card__title">Orari di apertura</h3><p className="settings-card__sub">Visibili sul sito nella sezione Contatti</p></div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {saved  && <span className="saved-badge">✓ Salvato</span>}
            {saving && <span className="saving-badge">Salvataggio…</span>}
            <button className="btn-save-hours" onClick={()=>saveSetting("hours",hours)}>Salva orari</button>
          </div>
        </div>
        {hours && (
          <div className="hours-editor">
            {DAY_KEYS.map((day) => {
              const d = hours[day as keyof WeekHours];
              return (
                <div key={day} className="hours-row-edit">
                  <label className="hours-day-toggle">
                    <input type="checkbox" checked={d.open} onChange={(e)=>updateDay(day,"open",e.target.checked)}/>
                    <span className="hours-day-name">{DAY_LABELS[day]}</span>
                  </label>
                  {d.open ? (
                    <div style={{display:"flex",flexDirection:"column",gap:4}}>
                      <div className="hours-times">
                        <input type="time" value={d.from} onChange={(e)=>updateDay(day,"from",e.target.value)} className="time-input"/>
                        <span className="hours-sep">–</span>
                        <input type="time" value={d.to} onChange={(e)=>updateDay(day,"to",e.target.value)} className="time-input"/>
                      </div>
                      {d.from2!=null && d.from2!=="" ? (
                        <div className="hours-times">
                          <input type="time" value={d.from2??""} onChange={(e)=>updateDay(day,"from2",e.target.value)} className="time-input"/>
                          <span className="hours-sep">–</span>
                          <input type="time" value={d.to2??""} onChange={(e)=>updateDay(day,"to2",e.target.value)} className="time-input"/>
                          <button type="button" onClick={()=>updateDay(day,"from2","")} style={{background:"transparent",border:"none",cursor:"pointer",color:"#B03A2E",fontSize:".8rem",padding:"0 4px"}}>✕</button>
                        </div>
                      ) : (
                        <button type="button" onClick={()=>{updateDay(day,"from2","12:00");updateDay(day,"to2","14:30");}} style={{background:"transparent",border:"1px dashed #EDE0CC",borderRadius:6,cursor:"pointer",color:"#7A7770",fontSize:".75rem",padding:"3px 8px",textAlign:"left",width:"fit-content"}}>+ Secondo turno</button>
                      )}
                    </div>
                  ) : <span className="hours-closed">Chiuso</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MENU TAB ─────────────────────────────────────────────────────────────────
function MenuTab({ slug }: { slug: string }) {
  const [menu, setMenu]   = useState<MenuCategory[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [editingItem, setEditingItem] = useState<{ catIdx: number; itemIdx: number | null } | null>(null);
  const [draft, setDraft] = useState<MenuItem>({ id:newId(), name:"", ingredients:"", price:0, popular:false, spicy:false, vegetarian:false, active:true, image_url:"" });
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatEmoji, setNewCatEmoji] = useState("🍕");
  const [uploadingItemImg, setUploadingItemImg] = useState(false);
  const uploadItemImage = async (file: File) => {
    setUploadingItemImg(true);
    const fd = new FormData(); fd.append("file", file);
    try { const res = await fetch(`/${slug}/api/upload`, { method:"POST", body:fd }); const d = await res.json(); if (d.url) setDraft((prev) => ({ ...prev, image_url:d.url })); } catch {}
    finally { setUploadingItemImg(false); }
  };
  useEffect(() => { fetch(`/${slug}/api/menu`).then((r) => r.json()).then(setMenu).catch(() => {}); }, [slug]);
  const saveCategory = async (cat: MenuCategory) => {
    setSaving(true);
    await fetch(`/${slug}/api/menu`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify([cat]) });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };
  const toggleActive  = (ci: number, ii: number) => { const u = menu.map((cat,c)=>c!==ci?cat:{...cat,items:cat.items.map((item,i)=>i!==ii?item:{...item,active:!item.active})}); setMenu(u); saveCategory(u[ci]); };
  const deleteItem    = (ci: number, ii: number) => { if (!confirm("Eliminare?")) return; const u = menu.map((cat,c)=>c!==ci?cat:{...cat,items:cat.items.filter((_,i)=>i!==ii)}); setMenu(u); saveCategory(u[ci]); };
  const deleteCategory = async (ci: number) => {
    if (!confirm(`Eliminare "${menu[ci].category}"?`)) return;
    const cat = menu[ci];
    if (cat.id) await fetch(`/${slug}/api/menu`, { method:"DELETE", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ id:cat.id }) });
    setMenu(menu.filter((_,c)=>c!==ci));
  };
  const openEdit = (ci: number, ii: number | null) => {
    setEditingItem({ catIdx:ci, itemIdx:ii });
    setDraft(ii===null ? { id:newId(), name:"", ingredients:"", price:0, popular:false, spicy:false, vegetarian:false, active:true, image_url:"" } : { ...menu[ci].items[ii] });
  };
  const saveItem = () => {
    if (!draft.name.trim() || !editingItem) return;
    const { catIdx:ci, itemIdx:ii } = editingItem;
    const u = menu.map((cat,c) => { if (c!==ci) return cat; return { ...cat, items: ii===null ? [...cat.items,draft] : cat.items.map((item,i)=>i===ii?draft:item) }; });
    setMenu(u); saveCategory(u[ci]); setEditingItem(null);
  };
  const addCategory = () => {
    if (!newCatName.trim()) return;
    const newCat: MenuCategory = { category:newCatName.trim(), emoji:newCatEmoji, sort_order:menu.length, items:[] };
    const u = [...menu, newCat]; setMenu(u);
    fetch(`/${slug}/api/menu`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify([newCat]) })
      .then(() => fetch(`/${slug}/api/menu`).then((r)=>r.json()).then(setMenu));
    setNewCatName(""); setNewCatEmoji("🍕"); setShowNewCat(false);
  };
  return (
    <div className="tab-content">
      <div className="menu-toolbar">
        <span className="menu-toolbar__title">{menu.reduce((s,c)=>s+c.items.length,0)} prodotti · {menu.length} categorie</span>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {saved && <span className="saved-badge">✓ Salvato</span>}
          {saving && <span className="saving-badge">Salvataggio…</span>}
          <button className="btn-add-cat" onClick={()=>setShowNewCat(!showNewCat)}>+ Categoria</button>
        </div>
      </div>
      {showNewCat && (
        <div className="new-cat-form">
          <input value={newCatEmoji} onChange={(e)=>setNewCatEmoji(e.target.value)} className="emoji-input"/>
          <input value={newCatName} onChange={(e)=>setNewCatName(e.target.value)} placeholder="Nome categoria" className="cat-name-input" onKeyDown={(e)=>e.key==="Enter"&&addCategory()}/>
          <button className="btn-confirm" onClick={addCategory}>Aggiungi</button>
          <button className="btn-cancel" onClick={()=>setShowNewCat(false)}>Annulla</button>
        </div>
      )}
      {menu.map((cat,ci) => (
        <div key={cat.id??cat.category} className="menu-section">
          <div className="menu-section__head">
            <h3 className="menu-section__title">{cat.emoji} {cat.category}</h3>
            <div style={{display:"flex",gap:6}}>
              <button className="btn-sm btn-sm--add" onClick={()=>openEdit(ci,null)}>+ Prodotto</button>
              <button className="btn-sm btn-sm--del" onClick={()=>deleteCategory(ci)}>🗑</button>
            </div>
          </div>
          <div className="menu-items-list">
            {cat.items.map((item,ii) => (
              <div key={item.id} className={`menu-item-row${!item.active?" menu-item-row--inactive":""}`}>
                <div className="menu-item-row__main">
                  <span className="menu-item-row__name">{item.name}</span>
                  <div className="menu-item-row__flags">
                    {item.popular && <span className="flag">⭐</span>}
                    {item.spicy   && <span className="flag">🌶</span>}
                    {item.vegetarian && <span className="flag">🌿</span>}
                    {!item.active && <span className="flag flag--off">OFF</span>}
                  </div>
                  <span className="menu-item-row__price">€{item.price.toFixed(2)}</span>
                </div>
                <p className="menu-item-row__ing">{item.ingredients}</p>
                <div className="menu-item-row__actions">
                  <button className="btn-sm btn-sm--edit" onClick={()=>openEdit(ci,ii)}>✏️ Modifica</button>
                  <button className="btn-sm" onClick={()=>toggleActive(ci,ii)}>{item.active?"⏸ Disattiva":"▶ Attiva"}</button>
                  <button className="btn-sm btn-sm--del" onClick={()=>deleteItem(ci,ii)}>🗑</button>
                </div>
              </div>
            ))}
            {cat.items.length===0 && <p className="empty-cat">Nessun prodotto.</p>}
          </div>
        </div>
      ))}
      {editingItem!==null && (
        <>
          <div className="modal-backdrop" onClick={()=>setEditingItem(null)}/>
          <div className="modal">
            <div className="modal__head"><h3>{editingItem.itemIdx===null?"Nuovo prodotto":"Modifica prodotto"}</h3><button onClick={()=>setEditingItem(null)}>✕</button></div>
            <div className="modal__body">
              <label className="modal-field"><span>Nome *</span><input value={draft.name} onChange={(e)=>setDraft({...draft,name:e.target.value})}/></label>
              <label className="modal-field"><span>Ingredienti</span><textarea value={draft.ingredients} onChange={(e)=>setDraft({...draft,ingredients:e.target.value})} rows={2}/></label>
              <label className="modal-field"><span>Descrizione breve</span><input value={draft.description??""} onChange={(e)=>setDraft({...draft,description:e.target.value})}/></label>
              <label className="modal-field"><span>Prezzo (€) *</span><input type="number" step="0.5" min="0" value={draft.price} onChange={(e)=>setDraft({...draft,price:parseFloat(e.target.value)||0})}/></label>
              <div className="modal-field">
                <span>Foto prodotto</span>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  {draft.image_url && <img src={draft.image_url} alt="" style={{width:60,height:60,objectFit:"cover",borderRadius:8,border:"1px solid #EDE0CC",flexShrink:0}}/>}
                  <label style={{padding:"8px 14px",background:"#F5EADA",border:"1.5px solid #EDE0CC",borderRadius:8,fontSize:".82rem",cursor:"pointer",fontFamily:"inherit"}}>
                    {uploadingItemImg?"Caricamento…":"📁 Carica foto"}
                    <input type="file" accept="image/*" style={{display:"none"}} onChange={(e)=>e.target.files?.[0]&&uploadItemImage(e.target.files[0])}/>
                  </label>
                  {draft.image_url && <button type="button" onClick={()=>setDraft({...draft,image_url:""})} style={{padding:"8px 12px",background:"transparent",border:"1px solid #EDE0CC",borderRadius:8,fontSize:".82rem",cursor:"pointer",color:"#7A7770"}}>Rimuovi</button>}
                </div>
              </div>
              <div className="modal-flags">
                {(["popular","spicy","vegetarian","active"] as const).map((flag) => (
                  <label key={flag} className="flag-toggle">
                    <input type="checkbox" checked={!!draft[flag]} onChange={(e)=>setDraft({...draft,[flag]:e.target.checked})}/>
                    <span>{({popular:"⭐ Popolare",spicy:"🌶 Piccante",vegetarian:"🌿 Vegetariano",active:"✅ Attivo"})[flag]}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="modal__foot">
              <button className="btn-cancel-modal" onClick={()=>setEditingItem(null)}>Annulla</button>
              <button className="btn-save-modal" onClick={saveItem} disabled={!draft.name.trim()}>Salva</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── PLACE ORDER TAB (kept for delivery tab — table ordering is now in Cassa) ──
function PlaceOrderTab({ slug }: { slug: string }) {
  const [orderType, setOrderType] = useState<"table"|"delivery">("table");
  const [tables, setTables]       = useState<KioskTable[]>([]);
  const [selTable, setSelTable]   = useState<KioskTable | null>(null);
  const [menu, setMenu]           = useState<MenuCategory[]>([]);
  const [activeCat, setActiveCat] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [cart, setCart]           = useState<OrderItem[]>([]);
  const [clientName, setClientName] = useState("");
  const [phone, setPhone]         = useState("");
  const [address, setAddress]     = useState("");
  const [notes, setNotes]         = useState("");
  const [popupItem, setPopupItem] = useState<MenuItem | null>(null);
  const [pSizeIdx, setPSizeIdx]   = useState<number | null>(null);
  const [pIngr, setPIngr]         = useState<Set<string>>(new Set());
  const [pExtras, setPExtras]     = useState<Set<string>>(new Set());
  const [sending, setSending]     = useState(false);
  const [sentId, setSentId]       = useState<string | null>(null);
  const [sendErr, setSendErr]     = useState("");
  useEffect(() => {
    fetch(`/${slug}/api/tables`).then((r)=>r.json()).then(setTables).catch(()=>{});
    fetch(`/${slug}/api/menu`).then((r)=>r.json()).then(setMenu).catch(()=>{});
    fetch(`/${slug}/api/settings`).then((r)=>r.json()).then((d)=>setDeliveryFee(d.delivery_fee??0)).catch(()=>{});
  }, [slug]);
  const cartTotal  = cart.reduce((s,i)=>s+i.price*i.qty,0);
  const grandTotal = cartTotal + (orderType==="delivery" ? deliveryFee : 0);
  const addToCart  = (item: OrderItem) => setCart((prev) => { const ex=prev.find((i)=>i.name===item.name); if (ex) return prev.map((i)=>i.name===item.name?{...i,qty:i.qty+1}:i); return [...prev,{...item,qty:1}]; });
  const incCart    = (name: string) => setCart((prev)=>prev.map((i)=>i.name===name?{...i,qty:i.qty+1}:i));
  const decCart    = (name: string) => setCart((prev)=>prev.map((i)=>i.name===name?{...i,qty:i.qty-1}:i).filter((i)=>i.qty>0));
  const openPopup  = (item: MenuItem) => { const ingr=item.options?.ingredients?.enabled?(item.options.ingredients.items??[]): []; setPopupItem(item); setPSizeIdx(null); setPIngr(new Set(ingr.filter((i)=>i.default_selected).map((i)=>i.name))); setPExtras(new Set()); };
  const ppSizes  = popupItem?.options?.sizes?.enabled       ? (popupItem.options.sizes.items       ?? []) : [];
  const ppIngr   = popupItem?.options?.ingredients?.enabled ? (popupItem.options.ingredients.items ?? []) : [];
  const ppExtras = popupItem?.options?.extras?.enabled      ? (popupItem.options.extras.items      ?? []) : [];
  const ppSzExt  = pSizeIdx!==null ? (ppSizes[pSizeIdx]?.extra??0) : 0;
  const ppExExt  = Array.from(pExtras).reduce((s,n)=>s+(ppExtras.find((e)=>e.name===n)?.extra??0),0);
  const ppPrice  = (popupItem?.price??0)+ppSzExt+ppExExt;
  const ppParts: string[] = [];
  if (pSizeIdx!==null && ppSizes[pSizeIdx]) ppParts.push(ppSizes[pSizeIdx].name);
  ppIngr.filter((i)=>i.default_selected&&!pIngr.has(i.name)).forEach((i)=>ppParts.push(`senza ${i.name}`));
  ppIngr.filter((i)=>!i.default_selected&&pIngr.has(i.name)).forEach((i)=>ppParts.push(`+ ${i.name}`));
  Array.from(pExtras).forEach((n)=>ppParts.push(`+ ${n}`));
  const ppCartName = popupItem?(popupItem.name+(ppParts.length?` · ${ppParts.join(", ")}`:"")):  "";
  const canAddPop  = ppSizes.length===0||pSizeIdx!==null;
  const addFromPopup = () => { if (!popupItem||!canAddPop) return; addToCart({ id:popupItem.id, name:ppCartName, price:ppPrice, qty:1 }); setPopupItem(null); };
  const reset = () => { setCart([]); setClientName(""); setPhone(""); setAddress(""); setNotes(""); setSelTable(null); };
  const canSubmit = cart.length>0&&(orderType==="table"?!!selTable:(!!clientName.trim()&&!!phone.trim()&&!!address.trim()));
  const submitOrder = async () => {
    if (!canSubmit||sending) return; setSending(true); setSendErr("");
    try {
      let res: Response;
      if (orderType==="table") {
        res = await fetch(`/${slug}/api/kiosk-order`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ tableToken:selTable!.token, clientName:clientName.trim()||"Receptionist", items:cart, total:cartTotal, notes:notes.trim() }) });
      } else {
        res = await fetch(`/${slug}/api/reception-order`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ clientName:clientName.trim(), phone:phone.trim(), address:address.trim(), items:cart, subtotal:cartTotal, notes:notes.trim() }) });
      }
      const data = await res.json();
      if (data.ok) { setSentId(data.id); reset(); setTimeout(()=>setSentId(null),5000); }
      else setSendErr(data.error??"Errore nell'invio");
    } catch { setSendErr("Errore di connessione"); } finally { setSending(false); }
  };
  const currentCat = menu[activeCat];
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:16, alignItems:"start" }}>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {menu.map((cat,idx) => (
            <button key={cat.category} onClick={()=>setActiveCat(idx)} style={{ padding:"7px 14px", background:activeCat===idx?"#1C1C1A":"#fff", color:activeCat===idx?"#FDF6EC":"#1C1C1A", border:"1.5px solid #EDE0CC", borderRadius:999, fontSize:".8rem", fontWeight:activeCat===idx?600:400, cursor:"pointer", fontFamily:"inherit" }}>
              {cat.emoji} {cat.category}
            </button>
          ))}
        </div>
        {currentCat && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:10 }}>
            {currentCat.items.filter((i)=>i.active!==false).map((item) => (
              <button key={item.id} onClick={()=>(item.options?.sizes?.enabled||item.options?.ingredients?.enabled||item.options?.extras?.enabled)?openPopup(item):addToCart({id:item.id,name:item.name,price:item.price,qty:1})}
                style={{ background:"#fff", border:"1.5px solid #EDE0CC", borderRadius:12, padding:"12px 10px", cursor:"pointer", textAlign:"left", display:"flex", flexDirection:"column", gap:4 }}>
                {item.image_url && <img src={item.image_url} alt="" style={{width:"100%",aspectRatio:"4/3",objectFit:"cover",borderRadius:8,marginBottom:4}}/>}
                <span style={{ fontSize:".88rem", fontWeight:600, color:"#1C1C1A", lineHeight:1.2 }}>{item.name}</span>
                <span style={{ fontSize:".82rem", color:"#B03A2E", fontWeight:700 }}>€{item.price.toFixed(2)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {/* Cart */}
      <div style={{ background:"#fff", border:"1.5px solid #EDE0CC", borderRadius:16, padding:16, display:"flex", flexDirection:"column", gap:12, position:"sticky", top:16 }}>
        <div style={{ display:"flex", gap:6 }}>
          {(["table","delivery"] as const).map((t) => (
            <button key={t} onClick={()=>{setOrderType(t);reset();}} style={{ flex:1, padding:"8px 0", borderRadius:8, fontSize:".8rem", fontWeight:600, cursor:"pointer", background:orderType===t?"#1C1C1A":"#fff", color:orderType===t?"#FDF6EC":"#1C1C1A", border:"1.5px solid #EDE0CC" }}>
              {t==="table"?"🪑 Tavolo":"🛵 Consegna"}
            </button>
          ))}
        </div>
        {orderType==="table" && (
          <select value={selTable?.id??""} onChange={(e)=>setSelTable(tables.find((t)=>t.id===e.target.value)??null)} style={{ padding:"9px 12px", border:"1.5px solid #EDE0CC", borderRadius:8, fontSize:".88rem", fontFamily:"inherit", outline:"none" }}>
            <option value="">— Seleziona tavolo —</option>
            {tables.filter((t)=>t.active).map((t)=><option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
        {orderType==="delivery" && (
          <>
            <input value={clientName} onChange={(e)=>setClientName(e.target.value)} placeholder="Nome cliente *" style={{ padding:"9px 12px", border:"1.5px solid #EDE0CC", borderRadius:8, fontSize:".88rem", fontFamily:"inherit", outline:"none" }}/>
            <input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="Telefono *" style={{ padding:"9px 12px", border:"1.5px solid #EDE0CC", borderRadius:8, fontSize:".88rem", fontFamily:"inherit", outline:"none" }}/>
            <input value={address} onChange={(e)=>setAddress(e.target.value)} placeholder="Indirizzo *" style={{ padding:"9px 12px", border:"1.5px solid #EDE0CC", borderRadius:8, fontSize:".88rem", fontFamily:"inherit", outline:"none" }}/>
          </>
        )}
        <input value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Note (opzionale)" style={{ padding:"9px 12px", border:"1.5px solid #EDE0CC", borderRadius:8, fontSize:".88rem", fontFamily:"inherit", outline:"none" }}/>
        <div style={{ display:"flex", flexDirection:"column", gap:4, maxHeight:200, overflowY:"auto" }}>
          {cart.map((item) => (
            <div key={item.name} style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ flex:1, fontSize:".83rem", color:"#1C1C1A" }}>{item.name}</span>
              <button onClick={()=>decCart(item.name)} style={{ width:22, height:22, borderRadius:4, border:"1px solid #EDE0CC", background:"#fff", cursor:"pointer", fontSize:13 }}>−</button>
              <span style={{ fontSize:".83rem", fontWeight:600, minWidth:16, textAlign:"center" }}>{item.qty}</span>
              <button onClick={()=>incCart(item.name)} style={{ width:22, height:22, borderRadius:4, border:"1px solid #EDE0CC", background:"#fff", cursor:"pointer", fontSize:13 }}>+</button>
              <span style={{ fontSize:".82rem", color:"#7A7770", minWidth:48, textAlign:"right" }}>€{(item.price*item.qty).toFixed(2)}</span>
            </div>
          ))}
        </div>
        {cart.length>0 && (
          <div style={{ borderTop:"1px solid #EDE0CC", paddingTop:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:".85rem", color:"#7A7770" }}>Totale{orderType==="delivery"&&deliveryFee>0?` (+€${deliveryFee.toFixed(2)} consegna)`:""}</span>
            <span style={{ fontFamily:"Georgia,serif", fontSize:"1.1rem", fontWeight:700, color:"#1C1C1A" }}>€{grandTotal.toFixed(2)}</span>
          </div>
        )}
        {sentId && <div style={{ padding:"10px 12px", background:"#EBF5EB", borderRadius:8, fontSize:".82rem", color:"#1B5E20", fontWeight:500 }}>✅ Ordine #{sentId} inviato!</div>}
        {sendErr && <p style={{ color:"#B03A2E", fontSize:".8rem" }}>{sendErr}</p>}
        <button onClick={submitOrder} disabled={!canSubmit||sending} style={{ padding:"12px 0", background:canSubmit?"#B03A2E":"#B0ACA5", color:"#fff", border:"none", borderRadius:10, fontSize:".9rem", fontWeight:600, cursor:canSubmit?"pointer":"not-allowed", fontFamily:"inherit" }}>
          {sending?"Invio…":`🧾 Invia ordine${cart.length>0?` €${grandTotal.toFixed(2)}`:""}`}
        </button>
      </div>
      {/* Options popup */}
      {popupItem && (
        <>
          <div style={{ position:"fixed", inset:0, background:"rgba(28,28,26,.5)", zIndex:200 }} onClick={()=>setPopupItem(null)}/>
          <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", zIndex:201, background:"#fff", borderRadius:16, padding:20, width:"90%", maxWidth:400, maxHeight:"80vh", overflowY:"auto", display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div><p style={{ fontWeight:700, color:"#1C1C1A" }}>{popupItem.name}</p>{popupItem.ingredients&&<p style={{ fontSize:".75rem", color:"#7A7770", marginTop:3 }}>{popupItem.ingredients}</p>}</div>
              <span style={{ fontWeight:700, color:"#B03A2E" }}>€{ppPrice.toFixed(2)}</span>
            </div>
            {ppSizes.length>0&&(<div><p style={{ fontSize:".75rem", fontWeight:600, color:"#7A7770", marginBottom:6 }}>Dimensione *</p><div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>{ppSizes.map((s,idx)=>(<button key={s.name} onClick={()=>setPSizeIdx(idx)} style={{ padding:"7px 12px", border:`2px solid ${pSizeIdx===idx?"#B03A2E":"#EDE0CC"}`, borderRadius:8, background:pSizeIdx===idx?"#B03A2E":"#fff", color:pSizeIdx===idx?"#fff":"#1C1C1A", fontSize:".8rem", cursor:"pointer", fontFamily:"inherit" }}>{s.name}{s.extra>0?` +€${s.extra.toFixed(2)}`:""}</button>))}</div></div>)}
            {ppIngr.length>0&&(<div><p style={{ fontSize:".75rem", fontWeight:600, color:"#7A7770", marginBottom:6 }}>Ingredienti</p><div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>{ppIngr.map((ingr)=>{ const sel=pIngr.has(ingr.name); return (<button key={ingr.name} onClick={()=>setPIngr((prev)=>{const s=new Set(prev);s.has(ingr.name)?s.delete(ingr.name):s.add(ingr.name);return s;})} style={{ padding:"6px 11px", border:`2px solid ${sel?"#1C1C1A":"#EDE0CC"}`, borderRadius:8, background:sel?"#1C1C1A":"#fff", color:sel?"#FDF6EC":"#1C1C1A", fontSize:".77rem", cursor:"pointer", fontFamily:"inherit" }}>{ingr.default_selected?(sel?`✓ ${ingr.name}`:`✗ ${ingr.name}`):(sel?`+ ${ingr.name}`:ingr.name)}</button>); })}</div></div>)}
            {ppExtras.length>0&&(<div><p style={{ fontSize:".75rem", fontWeight:600, color:"#7A7770", marginBottom:6 }}>Extra</p><div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>{ppExtras.map((extra)=>{ const sel=pExtras.has(extra.name); return (<button key={extra.name} onClick={()=>setPExtras((prev)=>{const s=new Set(prev);s.has(extra.name)?s.delete(extra.name):s.add(extra.name);return s;})} style={{ padding:"6px 11px", border:`2px solid ${sel?"#B03A2E":"#EDE0CC"}`, borderRadius:8, background:sel?"#B03A2E":"#fff", color:sel?"#fff":"#1C1C1A", fontSize:".77rem", cursor:"pointer", fontFamily:"inherit" }}>{sel?"✓":"+"} {extra.name} +€{extra.extra.toFixed(2)}</button>); })}</div></div>)}
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>setPopupItem(null)} style={{ flex:1, padding:"11px", background:"#F5EADA", border:"none", borderRadius:10, fontSize:".83rem", cursor:"pointer", fontFamily:"inherit" }}>Annulla</button>
              <button onClick={addFromPopup} disabled={!canAddPop} style={{ flex:2, padding:"11px", background:canAddPop?"#B03A2E":"#B0ACA5", color:"#fff", border:"none", borderRadius:10, fontSize:".85rem", fontWeight:600, cursor:canAddPop?"pointer":"not-allowed", fontFamily:"inherit" }}>+ Aggiungi €{ppPrice.toFixed(2)}</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── SHIFT TAB (delivery) ─────────────────────────────────────────────────────
function ShiftTab({ slug, staffId, staffName }: { slug: string; staffId: string; staffName: string }) {
  const [shift, setShift]     = useState<DeliveryShift | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const fetchShift = useCallback(async () => {
    const res = await fetch(`/${slug}/api/shifts?staffId=${staffId}&status=active`);
    if (res.ok) { const d = await res.json(); if (d.length>0) { setShift(d[0]); setLoading(false); return; } }
    const res2 = await fetch(`/${slug}/api/shifts?staffId=${staffId}&status=pending_handover`);
    if (res2.ok) { const d2 = await res2.json(); setShift(d2.length>0?d2[0]:null); } else setShift(null);
    setLoading(false);
  }, [slug, staffId]);
  useEffect(() => { fetchShift(); }, [fetchShift]);
  const closeShift = async () => {
    if (!shift) return; setClosing(true);
    await fetch(`/${slug}/api/shifts/${shift.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action:"close" }) });
    setClosing(false); fetchShift();
  };
  const handoverTotal = shift ? shift.initial_float+shift.total_collected : 0;
  if (loading) return <div className="tab-content"><p style={{ color:"#7A7770", fontSize:".9rem" }}>Caricamento…</p></div>;
  return (
    <div className="tab-content">
      {!shift && <div className="empty-state"><span>🛵</span><p>Nessun turno attivo</p><small>Chiedi all&apos;admin di aprire il tuo turno prima di iniziare le consegne</small></div>}
      {shift?.status==="active" && (
        <div className="settings-card">
          <div className="settings-card__head">
            <div><h3 className="settings-card__title">Il mio turno — {staffName}</h3><p className="settings-card__sub">Iniziato alle {new Date(shift.started_at).toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})}</p></div>
            <span className="stat-pill stat-pill--ready">● Attivo</span>
          </div>
          <div style={{ padding:"16px 20px", display:"flex", flexDirection:"column", gap:10 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
              {[["Consegne",shift.deliveries_count],["Incassato",`€${shift.total_collected.toFixed(2)}`],["Fondo",`€${shift.initial_float.toFixed(2)}`]].map(([l,v])=>(
                <div key={String(l)} style={{ background:"#F5EADA", borderRadius:10, padding:"12px 14px", textAlign:"center" }}>
                  <p style={{ fontSize:".72rem", color:"#7A7770", marginBottom:4 }}>{l}</p>
                  <p style={{ fontFamily:"Georgia,serif", fontSize:"1.1rem", fontWeight:700, color:"#1C1C1A" }}>{v}</p>
                </div>
              ))}
            </div>
            <button onClick={closeShift} disabled={closing} style={{ alignSelf:"flex-end", padding:"12px 24px", background:"#1C1C1A", color:"#FDF6EC", border:"none", borderRadius:10, fontSize:".88rem", fontWeight:600, cursor:closing?"wait":"pointer", fontFamily:"inherit" }}>
              {closing?"Chiusura…":"🔒 Chiudi turno"}
            </button>
          </div>
        </div>
      )}
      {shift?.status==="pending_handover" && (
        <div className="settings-card">
          <div className="settings-card__head"><div><h3 className="settings-card__title">Turno chiuso — consegna il denaro</h3><p className="settings-card__sub">Porta questo importo alla receptionist o all&apos;admin</p></div></div>
          <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:10 }}>
            <div style={{ background:"#FEF3DB", borderRadius:12, padding:"20px 24px", textAlign:"center" }}>
              <p style={{ fontSize:".85rem", color:"#8A5E12", marginBottom:8 }}>Importo totale da consegnare</p>
              <p style={{ fontFamily:"Georgia,serif", fontSize:"2.5rem", fontWeight:700, color:"#8A5E12" }}>€{handoverTotal.toFixed(2)}</p>
              <p style={{ fontSize:".75rem", color:"#B0ACA5", marginTop:8 }}>Fondo cassa €{shift.initial_float.toFixed(2)} + incassi €{shift.total_collected.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN SHIFTS TAB ─────────────────────────────────────────────────────────
function AdminShiftsTab({ slug }: { slug: string }) {
  const [shifts, setShifts]             = useState<DeliveryShift[]>([]);
  const [deliveryStaff, setDeliveryStaff] = useState<{ id: string; name: string }[]>([]);
  const [selStaff, setSelStaff]         = useState<string>("");
  const [selStaffName, setSelStaffName] = useState<string>("");
  const [initFloat, setInitFloat]       = useState("20");
  const [creating, setCreating]         = useState(false);
  const [createErr, setCreateErr]       = useState("");
  const fetchAll = useCallback(async () => {
    const [s,d] = await Promise.all([
      fetch(`/${slug}/api/shifts`).then((r)=>r.json()),
      fetch(`/${slug}/api/staff?role=delivery`).then((r)=>r.json()),
    ]);
    setShifts(s); setDeliveryStaff(d);
    if (d.length>0&&!selStaff) { setSelStaff(String(d[0].id)); setSelStaffName(d[0].name); }
  }, [slug, selStaff]);
  useEffect(() => { fetchAll(); }, [fetchAll]);
  const createShift = async () => {
    if (!selStaff) return; setCreating(true); setCreateErr("");
    const res = await fetch(`/${slug}/api/shifts`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ staffId:selStaff, staffName:selStaffName, initialFloat:parseFloat(initFloat)||0 }) });
    const data = await res.json();
    if (data.error) setCreateErr(data.error); else fetchAll();
    setCreating(false);
  };
  const confirmHandover = async (id: string) => {
    await fetch(`/${slug}/api/shifts/${id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action:"confirm", confirmedBy:"admin" }) });
    fetchAll();
  };
  const active  = shifts.filter((s)=>s.status==="active");
  const pending = shifts.filter((s)=>s.status==="pending_handover");
  const closed  = shifts.filter((s)=>s.status==="closed").slice(0,10);
  return (
    <div className="tab-content">
      <div className="settings-card">
        <div className="settings-card__head"><div><h3 className="settings-card__title">Apri turno fattorino</h3><p className="settings-card__sub">Assegna il fondo cassa iniziale per le monete da resto</p></div></div>
        <div style={{ padding:"12px 20px 16px", display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
          <select value={selStaff} onChange={(e)=>{setSelStaff(e.target.value);setSelStaffName(e.target.selectedOptions[0]?.text??"");}} style={{ flex:1, minWidth:160, padding:"9px 12px", border:"1.5px solid #EDE0CC", borderRadius:8, fontSize:".88rem", fontFamily:"inherit", outline:"none", background:"#fff" }}>
            {deliveryStaff.length===0&&<option value="">Nessun fattorino</option>}
            {deliveryStaff.map((s)=><option key={s.id} value={String(s.id)}>{s.name}</option>)}
          </select>
          <div style={{ display:"flex", alignItems:"center", gap:6, border:"1.5px solid #EDE0CC", borderRadius:8, padding:"6px 10px", background:"#fff" }}>
            <span style={{ fontSize:".82rem", color:"#7A7770" }}>€</span>
            <input type="number" min="0" step="0.5" value={initFloat} onChange={(e)=>setInitFloat(e.target.value)} style={{ width:60, border:"none", outline:"none", fontSize:".88rem", fontFamily:"inherit" }}/>
            <span style={{ fontSize:".72rem", color:"#B0ACA5" }}>fondo</span>
          </div>
          <button onClick={createShift} disabled={creating||!selStaff} className="btn-save-hours">{creating?"Apertura…":"▶ Apri turno"}</button>
          {createErr&&<p style={{ color:"#B03A2E", fontSize:".8rem", width:"100%" }}>{createErr}</p>}
        </div>
      </div>
      {active.length>0&&(
        <div className="settings-card">
          <div className="settings-card__head"><div><h3 className="settings-card__title">Turni attivi</h3></div></div>
          <div style={{ padding:"0 20px 16px", display:"flex", flexDirection:"column", gap:8 }}>
            {active.map((s)=>(<div key={s.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid #F5EADA", flexWrap:"wrap", gap:8 }}><div><p style={{ fontWeight:600, color:"#1C1C1A", fontSize:".9rem" }}>🛵 {s.staff_name}</p><p style={{ fontSize:".75rem", color:"#7A7770" }}>Iniziato {new Date(s.started_at).toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})} · {s.deliveries_count} consegne · incassato €{s.total_collected.toFixed(2)} · fondo €{s.initial_float.toFixed(2)}</p></div><span className="stat-pill stat-pill--ready">● Attivo</span></div>))}
          </div>
        </div>
      )}
      {pending.map((s)=>(<div key={s.id} className="handover-banner"><div><p className="handover-banner__title">💰 {s.staff_name} — turno da chiudere</p><p className="handover-banner__sub">Fondo €{s.initial_float.toFixed(2)} + incassi €{s.total_collected.toFixed(2)} = <strong>€{(s.initial_float+s.total_collected).toFixed(2)}</strong></p></div><button className="action-btn action-btn--ready" onClick={()=>confirmHandover(s.id)} style={{ whiteSpace:"nowrap", flexShrink:0 }}>✅ Confermo ricevuto</button></div>))}
      {closed.length>0&&(
        <div className="settings-card">
          <div className="settings-card__head"><div><h3 className="settings-card__title">Turni recenti chiusi</h3></div></div>
          <div style={{ padding:"0 20px 16px", display:"flex", flexDirection:"column", gap:6 }}>
            {closed.map((s)=>(<div key={s.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #F5EADA", flexWrap:"wrap", gap:6 }}><div><p style={{ fontWeight:500, color:"#1C1C1A", fontSize:".85rem" }}>{s.staff_name}</p><p style={{ fontSize:".72rem", color:"#7A7770" }}>{new Date(s.started_at).toLocaleDateString("it-IT")} · {s.deliveries_count} consegne · €{(s.initial_float+s.total_collected).toFixed(2)} totale</p></div><span style={{ fontSize:".72rem", color:"#7A7770" }}>Conf. {s.confirmed_by}</span></div>))}
          </div>
        </div>
      )}
      {active.length===0&&pending.length===0&&closed.length===0&&(<div className="empty-state"><span>🛵</span><p>Nessun turno</p><small>Apri il primo turno per un fattorino</small></div>)}
    </div>
  );
}

// ─── QR CODE ──────────────────────────────────────────────────────────────────
function QrCodeCanvas({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    import("qrcode").then((QRCode) => { QRCode.toCanvas(canvasRef.current!, value, { width:180, margin:2, color:{ dark:"#1C1C1A", light:"#FFFFFF" } }); });
  }, [value]);
  return <canvas ref={canvasRef} style={{ borderRadius:8, display:"block" }}/>;
}

// ─── TABLES TAB ───────────────────────────────────────────────────────────────
function TablesTab({ slug }: { slug: string }) {
  const [tables, setTables] = useState<KioskTable[]>([]);
  const [newName, setNewName] = useState("");
  const [adding, setAdding]   = useState(false);
  const [origin, setOrigin]   = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
    fetch(`/${slug}/api/tables`).then((r)=>r.json()).then(setTables).catch(()=>{});
  }, [slug]);
  const addTable = async () => {
    if (!newName.trim()) return; setAdding(true);
    try {
      const res = await fetch(`/${slug}/api/tables`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ name:newName.trim() }) });
      const data = await res.json();
      if (data.id) { setTables((prev)=>[...prev,data]); setNewName(""); }
    } finally { setAdding(false); }
  };
  const deleteTable = async (id: string) => {
    if (!confirm("Eliminare questo tavolo? Il QR code non funzionerà più.")) return;
    await fetch(`/${slug}/api/tables/${id}`, { method:"DELETE" });
    setTables((prev)=>prev.filter((t)=>t.id!==id));
  };
  return (
    <div className="tab-content">
      <div className="settings-card">
        <div className="settings-card__head"><div><h3 className="settings-card__title">Aggiungi tavolo</h3><p className="settings-card__sub">Ogni tavolo ottiene un QR code univoco per il kiosk</p></div></div>
        <div style={{ padding:"12px 20px 16px", display:"flex", gap:8, flexWrap:"wrap" }}>
          <input value={newName} onChange={(e)=>setNewName(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&addTable()} placeholder="Es. Tavolo 1, Bancone, Terrazza…" style={{ flex:1, minWidth:200, padding:"9px 14px", border:"1.5px solid #EDE0CC", borderRadius:8, fontSize:".9rem", fontFamily:"inherit", outline:"none" }}/>
          <button onClick={addTable} disabled={adding||!newName.trim()} className="btn-save-hours">{adding?"Aggiunta…":"+ Aggiungi tavolo"}</button>
        </div>
      </div>
      {tables.length===0 ? (
        <div className="empty-state"><span>🪑</span><p>Nessun tavolo configurato</p><small>Aggiungi i tavoli per generare i QR code del kiosk</small></div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:16 }}>
          {tables.map((table) => {
            const kioskUrl = `${origin}/${slug}/kiosk?table=${table.token}`;
            return (
              <div key={table.id} style={{ background:"#fff", border:"1px solid #EDE0CC", borderRadius:16, padding:20, display:"flex", flexDirection:"column", gap:14, alignItems:"center", boxShadow:"0 2px 12px rgba(28,28,26,.07)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", width:"100%" }}>
                  <div><p style={{ fontFamily:"Georgia,serif", fontSize:"1rem", fontWeight:700, color:"#1C1C1A" }}>🪑 {table.name}</p><p style={{ fontSize:".68rem", color:"#B0ACA5", marginTop:2, fontFamily:"monospace" }}>{table.token.slice(0,16)}…</p></div>
                  <button onClick={()=>deleteTable(table.id)} style={{ padding:"6px 10px", background:"transparent", border:"1px solid #FFCDD2", borderRadius:8, fontSize:".75rem", cursor:"pointer", color:"#B71C1C" }}>🗑 Elimina</button>
                </div>
                {origin && <QrCodeCanvas value={kioskUrl}/>}
                <p style={{ fontSize:".7rem", color:"#7A7770", textAlign:"center", wordBreak:"break-all", lineHeight:1.4, width:"100%" }}>{kioskUrl}</p>
                <button onClick={()=>navigator.clipboard.writeText(kioskUrl)} style={{ width:"100%", padding:"8px", background:"#F5EADA", border:"1px solid #EDE0CC", borderRadius:8, fontSize:".82rem", cursor:"pointer", color:"#3A3A36", fontFamily:"inherit" }}>📋 Copia link</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function POSPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [user,         setUser]         = useState<StaffUser | null>(null);
  const [authChecked,  setAuthChecked]  = useState(false);
  const [tab,          setTab]          = useState<PosTab>("cassa");
  const [activeShift,  setActiveShift]  = useState<DeliveryShift | null>(null);

  // Cassa state
  const [tables,       setTables]       = useState<KioskTable[]>([]);
  const [openInvoices, setOpenInvoices] = useState<OpenInv[]>([]);
  const [articles,     setArticles]     = useState<Article[]>([]);
  const [categories,   setCategories]   = useState<string[]>([]);
  const [selCat,       setSelCat]       = useState<string>("all");
  const [search,       setSearch]       = useState("");
  const [selTable,     setSelTable]     = useState<KioskTable | null>(null);
  const [cart,         setCart]         = useState<CartItem[]>([]);
  const [payMethod,    setPayMethod]    = useState<"cash"|"card">("cash");
  const [paying,       setPaying]       = useState(false);
  const [sending,      setSending]      = useState(false);
  const [payErr,       setPayErr]       = useState("");
  const [payModal,     setPayModal]     = useState(false);
  const [openInvId,    setOpenInvId]    = useState<string | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [articleError, setArticleError] = useState<string | null>(null);

  // Auth
  useEffect(() => {
    try { const s = localStorage.getItem("shop_user"); if (s) setUser(JSON.parse(s)); } catch {}
    setAuthChecked(true);
  }, []);

  // Active shift (delivery)
  const fetchActiveShift = useCallback(async () => {
    if (!user || user.role !== "delivery") return;
    const res = await fetch(`/${slug}/api/shifts?staffId=${user.id}&status=active`);
    if (res.ok) { const d = await res.json(); setActiveShift(d.length>0?d[0]:null); }
  }, [slug, user]);
  useEffect(() => { fetchActiveShift(); }, [fetchActiveShift]);

  const loadTables = useCallback(async () => {
    const [tRes, iRes] = await Promise.all([fetch(`/${slug}/api/tables`), fetch(`/${slug}/api/pos/invoices`)]);
    if (tRes.ok) { const d = await tRes.json(); setTables(Array.isArray(d)?d:(d.tables??[])); }
    if (iRes.ok) { const d = await iRes.json(); setOpenInvoices(d.invoices??[]); }
  }, [slug]);

  const loadArticles = useCallback(async () => {
    try {
      const res = await fetch(`/${slug}/api/pos/articles`);
      const d = await res.json();
      if (!res.ok) { setArticleError(d.error??"Errore caricamento articoli"); return; }
      setArticles(d.articles??[]);
      setCategories(d.categories??[]);
      setArticleError((d.debug?.barpro_count??0)===0&&(d.debug?.menu_count??0)===0 ? `Nessun articolo. Debug: ${JSON.stringify(d.debug)}` : null);
    } catch (e) { setArticleError(`Errore: ${String(e)}`); }
  }, [slug]);

  useEffect(() => {
    if (!user) return;
    Promise.all([loadTables(), loadArticles()]).finally(() => setLoading(false));
  }, [user, loadTables, loadArticles]);

  const invMap = useMemo(() => { const m: Record<string,OpenInv>={}; for (const inv of openInvoices) if (inv.table_id) m[inv.table_id]=inv; return m; }, [openInvoices]);
  const filtered = useMemo(() => articles.filter(a => (selCat==="all"||a.category===selCat) && (!search||a.name.toLowerCase().includes(search.toLowerCase()))), [articles, selCat, search]);
  const totals = useMemo(() => calcTotals(cart), [cart]);

  function addArticle(a: Article) {
    if (search) setSearch("");
    setCart(prev => { const idx=prev.findIndex(c=>c.article.id===a.id); if (idx>=0) { const n=[...prev]; n[idx]={...n[idx],qty:n[idx].qty+1}; return n; } return [...prev,{article:a,qty:1}]; });
  }
  function changeQty(id: string, delta: number) { setCart(prev=>prev.map(c=>c.article.id===id?{...c,qty:c.qty+delta}:c).filter(c=>c.qty>0)); }
  function selectTable(t: KioskTable) {
    const inv = invMap[t.id];
    if (inv?.invoice_items?.length) {
      // Load existing items from open invoice into cart
      const loaded: CartItem[] = inv.invoice_items.map(ii => {
        const art = articles.find(a => a.name === ii.article_name) ?? {
          id: `inv_${ii.id}`, code: "", name: ii.article_name,
          price: ii.unit_price, category: "", vat_rate: ii.vat_rate,
        };
        return { article: art, qty: ii.quantity };
      });
      setCart(loaded);
      setOpenInvId(inv.id);
    } else {
      setCart([]);
      setOpenInvId(null);
    }
    setSelTable(t); setPayErr(""); setSelCat("all"); setSearch("");
  }

  function buildItems() {
    return cart.map(c => ({
      article_id:   (c.article.id.startsWith("menu_")||c.article.id.startsWith("inv_")) ? null : c.article.id,
      article_code: c.article.code,
      article_name: c.article.name,
      quantity:     c.qty,
      unit_price:   c.article.price,
      vat_rate:     c.article.vat_rate,
      total_price:  +(c.article.price * c.qty).toFixed(2),
    }));
  }

  async function sendToTable() {
    if (!selTable || cart.length === 0) return;
    setSending(true); setPayErr("");
    try {
      if (openInvId) {
        const res = await fetch(`/${slug}/api/pos/invoices/${openInvId}`, {
          method: "PATCH", headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ action:"update_items", items:buildItems(), subtotal:+totals.subtotal.toFixed(2), vat_amount:+totals.vat_amount.toFixed(2), total:+totals.total.toFixed(2) }),
        });
        const data = await res.json();
        if (!res.ok) { setPayErr(data.error ?? "Errore aggiornamento"); return; }
      } else {
        const res = await fetch(`/${slug}/api/pos/invoices`, {
          method: "POST", headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ table_id:selTable.id, employee_id:user?.id, items:buildItems(), subtotal:+totals.subtotal.toFixed(2), vat_amount:+totals.vat_amount.toFixed(2), total:+totals.total.toFixed(2), status:"open" }),
        });
        const data = await res.json();
        if (!res.ok) { setPayErr(data.error ?? "Errore"); return; }
        setOpenInvId(data.invoice_id);
      }
      await loadTables();
    } catch { setPayErr("Errore di connessione"); } finally { setSending(false); }
  }

  async function closeTable(method: "cash"|"card") {
    if (!selTable || cart.length === 0) return;
    setPaying(true); setPayErr("");
    try {
      if (openInvId) {
        // Update items first, then close
        await fetch(`/${slug}/api/pos/invoices/${openInvId}`, {
          method:"PATCH", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ action:"update_items", items:buildItems(), subtotal:+totals.subtotal.toFixed(2), vat_amount:+totals.vat_amount.toFixed(2), total:+totals.total.toFixed(2) }),
        });
        const res = await fetch(`/${slug}/api/pos/invoices/${openInvId}`, {
          method:"PATCH", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ status:"paid", payment_method:method }),
        });
        const data = await res.json();
        if (!res.ok) { setPayErr(data.error ?? "Errore pagamento"); return; }
      } else {
        const res = await fetch(`/${slug}/api/pos/invoices`, {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ table_id:selTable.id, employee_id:user?.id, items:buildItems(), subtotal:+totals.subtotal.toFixed(2), vat_amount:+totals.vat_amount.toFixed(2), total:+totals.total.toFixed(2), status:"paid", payment_method:method }),
        });
        const data = await res.json();
        if (!res.ok) { setPayErr(data.error ?? "Errore"); return; }
      }
      setCart([]); setSelTable(null); setOpenInvId(null); setPayModal(false);
      await loadTables();
    } catch { setPayErr("Errore di connessione"); } finally { setPaying(false); }
  }

  const logout = () => { localStorage.removeItem("shop_user"); setUser(null); };

  if (!authChecked) return null;
  if (!user) return <><LoginScreen onLogin={u=>{setUser(u);setTab(u.role==="delivery"?"orders":"cassa");}} slug={slug}/><style>{shopStyles}</style></>;

  const roleBadge: Record<StaffRole,string> = { reception:"🧑‍💼 Receptionist", delivery:"🛵 Fattorino", admin:"👑 Admin" };
  const isCassa = tab === "cassa";

  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column", background: isCassa?"#0f172a":"#F5EADA", fontFamily:"system-ui,sans-serif", overflow:"hidden" }}>

      {/* ── Unified Header ── */}
      <header style={{ flexShrink:0, background:"#1C1C1A", borderBottom:"2px solid #166534", display:"flex", alignItems:"center", padding:"0 16px", gap:8, flexWrap:"wrap", minHeight:52, zIndex:10 }}>
        <span style={{ fontFamily:"Georgia,serif", fontSize:"1rem", fontWeight:700, color:"#FDF6EC", whiteSpace:"nowrap" }}>🍕 La Piazzetta</span>
        <span style={{ fontSize:".7rem", fontWeight:500, padding:"3px 9px", borderRadius:999, background:"rgba(253,246,236,.12)", color:"rgba(253,246,236,.7)", whiteSpace:"nowrap" }}>{roleBadge[user.role]}</span>
        <nav style={{ display:"flex", gap:4, flexWrap:"wrap", flex:1 }}>
          {(user.role==="admin"||user.role==="reception") && (
            <button onClick={()=>setTab("cassa")} style={{ padding:"6px 12px", background:tab==="cassa"?"rgba(22,163,74,.9)":"rgba(253,246,236,.08)", border:"none", color:tab==="cassa"?"#fff":"rgba(253,246,236,.7)", borderRadius:8, cursor:"pointer", fontSize:".8rem", fontWeight:tab==="cassa"?700:500 }}>
              💰 Cassa{articles.length>0?` (${articles.length})`:""}
            </button>
          )}
          <button onClick={()=>setTab("orders")} style={{ padding:"6px 12px", background:tab==="orders"?"rgba(22,163,74,.9)":"rgba(253,246,236,.08)", border:"none", color:tab==="orders"?"#fff":"rgba(253,246,236,.7)", borderRadius:8, cursor:"pointer", fontSize:".8rem", fontWeight:tab==="orders"?700:500 }}>📋 Ordini</button>
          {user.role==="delivery" && (
            <button onClick={()=>setTab("shift")} style={{ padding:"6px 12px", background:tab==="shift"?"rgba(22,163,74,.9)":"rgba(253,246,236,.08)", border:"none", color:tab==="shift"?"#fff":"rgba(253,246,236,.7)", borderRadius:8, cursor:"pointer", fontSize:".8rem", fontWeight:tab==="shift"?700:500 }}>🛵 Turno</button>
          )}
          {user.role==="admin" && (<>
            <button onClick={()=>setTab("shifts")} style={{ padding:"6px 12px", background:tab==="shifts"?"rgba(22,163,74,.9)":"rgba(253,246,236,.08)", border:"none", color:tab==="shifts"?"#fff":"rgba(253,246,236,.7)", borderRadius:8, cursor:"pointer", fontSize:".8rem", fontWeight:tab==="shifts"?700:500 }}>🛵 Turni</button>
            <button onClick={()=>setTab("menu")} style={{ padding:"6px 12px", background:tab==="menu"?"rgba(22,163,74,.9)":"rgba(253,246,236,.08)", border:"none", color:tab==="menu"?"#fff":"rgba(253,246,236,.7)", borderRadius:8, cursor:"pointer", fontSize:".8rem", fontWeight:tab==="menu"?700:500 }}>🍕 Menu</button>
            <button onClick={()=>setTab("tables")} style={{ padding:"6px 12px", background:tab==="tables"?"rgba(22,163,74,.9)":"rgba(253,246,236,.08)", border:"none", color:tab==="tables"?"#fff":"rgba(253,246,236,.7)", borderRadius:8, cursor:"pointer", fontSize:".8rem", fontWeight:tab==="tables"?700:500 }}>🪑 Tavoli</button>
            <button onClick={()=>setTab("settings")} style={{ padding:"6px 12px", background:tab==="settings"?"rgba(22,163,74,.9)":"rgba(253,246,236,.08)", border:"none", color:tab==="settings"?"#fff":"rgba(253,246,236,.7)", borderRadius:8, cursor:"pointer", fontSize:".8rem", fontWeight:tab==="settings"?700:500 }}>⚙️ Impostazioni</button>
          </>)}
        </nav>
        <span style={{ color:"rgba(253,246,236,.5)", fontSize:".8rem", whiteSpace:"nowrap" }}>{user.name}</span>
        <button onClick={logout} style={{ background:"none", border:"1px solid #334155", color:"#94a3b8", borderRadius:6, padding:"4px 10px", cursor:"pointer", fontSize:12, whiteSpace:"nowrap" }}>🚪 Esci</button>
      </header>

      {/* ── CASSA TAB (full-height POS) ── */}
      {isCassa && (
        <div style={{ flex:1, display:"flex", overflow:"hidden", minHeight:0, flexDirection:"column" }}>
          {/* Main body */}
          <div style={{ flex:1, display:"flex", overflow:"hidden", minHeight:0 }}>
            {/* Categories */}
            <div style={{ width:160, background:"#1e293b", display:"flex", flexDirection:"column", borderRight:"1px solid #0f172a", overflow:"hidden" }}>
              <div style={{ background:"#166534", padding:"8px 12px", fontSize:12, fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:"#bbf7d0" }}>Categorie</div>
              <div style={{ flex:1, overflowY:"auto" }}>
                {[{ id:"all", label:"Tutti" }, ...categories.map(c=>({ id:c, label:catLabel(c) }))].map(cat => (
                  <button key={cat.id} onClick={()=>{ setSelCat(cat.id); setSearch(""); }}
                    style={{ display:"block", width:"100%", textAlign:"left", padding:"10px 14px", background:selCat===cat.id?"#166534":"transparent", color:selCat===cat.id?"#fff":"#94a3b8", border:"none", borderBottom:"1px solid #0f172a", cursor:"pointer", fontSize:13, fontWeight:selCat===cat.id?600:400 }}>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Articles */}
            <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
              <div style={{ background:"#166534", padding:"8px 12px", fontSize:12, fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:"#bbf7d0", display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ flex:1 }}>Prodotti</span>
                <input value={search} onChange={e=>{ setSearch(e.target.value); setSelCat("all"); }} placeholder="🔍  Cerca…"
                  style={{ background:"#14532d", border:"1px solid #15803d", borderRadius:6, padding:"4px 10px", color:"#f0fdf4", fontSize:12, width:160, outline:"none" }}/>
              </div>
              {articleError && <div style={{ margin:12, padding:12, background:"#450a0a", border:"1px solid #991b1b", borderRadius:8, color:"#fca5a5", fontSize:12 }}>⚠ {articleError}</div>}
              {loading ? (
                <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:"#64748b" }}>Caricamento…</div>
              ) : (
                <div style={{ flex:1, overflowY:"auto", padding:10, display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))", gap:8, alignContent:"start" }}>
                  {filtered.map(a => (
                    <button key={a.id} onClick={()=>addArticle(a)}
                      style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:6, padding:"8px 6px", cursor:"pointer", textAlign:"center" }}
                      onMouseEnter={e=>{ e.currentTarget.style.background="#dbeafe"; e.currentTarget.style.borderColor="#93c5fd"; }}
                      onMouseLeave={e=>{ e.currentTarget.style.background="#f8fafc"; e.currentTarget.style.borderColor="#e2e8f0"; }}>
                      <div style={{ color:"#0f172a", fontSize:11, fontWeight:600, lineHeight:1.3, marginBottom:4 }}>{a.name}</div>
                      <div style={{ color:"#1d4ed8", fontSize:12, fontWeight:700 }}>{eur(a.price)}</div>
                    </button>
                  ))}
                  {filtered.length===0 && !loading && (
                    <p style={{ color:"#64748b", gridColumn:"1/-1", textAlign:"center", marginTop:40, fontSize:13 }}>
                      {articles.length===0?"Nessun articolo nel database":"Nessun risultato"}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Invoice panel */}
            <div style={{ width:300, display:"flex", flexDirection:"column", background:"#1e293b", borderLeft:"1px solid #0f172a" }}>
              <div style={{ background:"#166534", padding:"8px 12px", fontSize:12, fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:"#bbf7d0" }}>
                {selTable?`Conto — ${selTable.name}`:"Ordine"}
              </div>
              {!selTable && <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:"#475569", fontSize:13, padding:20, textAlign:"center" }}>Seleziona un tavolo dalla barra in basso</div>}
              {selTable && (<>
                <div style={{ flex:1, overflowY:"auto", padding:8 }}>
                  {cart.length===0 && <p style={{ color:"#475569", textAlign:"center", marginTop:30, fontSize:12 }}>Aggiungi prodotti dal menu</p>}
                  {cart.map(c => (
                    <div key={c.article.id} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 4px", borderBottom:"1px solid #0f172a" }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ color:"#f1f5f9", fontSize:12, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.article.name}</div>
                        <div style={{ color:"#64748b", fontSize:11 }}>{eur(c.article.price)} × {c.qty}</div>
                      </div>
                      <div style={{ color:"#f1f5f9", fontSize:13, fontWeight:700, minWidth:52, textAlign:"right" }}>{eur(c.article.price*c.qty)}</div>
                      <div style={{ display:"flex", gap:3 }}>
                        <button onClick={()=>changeQty(c.article.id,-1)} style={{ background:"#0f172a", border:"1px solid #334155", color:"#f87171", borderRadius:4, width:22, height:22, cursor:"pointer", fontSize:14, lineHeight:1, padding:0 }}>−</button>
                        <button onClick={()=>changeQty(c.article.id, 1)} style={{ background:"#0f172a", border:"1px solid #334155", color:"#4ade80", borderRadius:4, width:22, height:22, cursor:"pointer", fontSize:14, lineHeight:1, padding:0 }}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
                {cart.length>0 && (
                  <div style={{ padding:"10px 12px", borderTop:"1px solid #0f172a", background:"#0f172a" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", color:"#64748b", fontSize:12, marginBottom:3 }}><span>Imponibile</span><span>{eur(totals.subtotal)}</span></div>
                    {Object.entries(totals.vatByRate).map(([r,v]) => (<div key={r} style={{ display:"flex", justifyContent:"space-between", color:"#64748b", fontSize:11, marginBottom:2 }}><span>IVA {r}%</span><span>{eur(v)}</span></div>))}
                    <div style={{ display:"flex", justifyContent:"space-between", color:"#f1f5f9", fontSize:18, fontWeight:700, borderTop:"1px solid #1e293b", paddingTop:6, marginTop:4 }}><span>TOTALE</span><span>{eur(totals.total)}</span></div>
                  </div>
                )}
                {payErr && <p style={{ color:"#f87171", fontSize:11, textAlign:"center", margin:"0 12px 6px" }}>{payErr}</p>}
                <div style={{ display:"flex", flexDirection:"column", gap:6, padding:"10px 12px", borderTop:"1px solid #0f172a" }}>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={()=>{ setSelTable(null); setOpenInvId(null); setCart([]); }} style={{ flex:1, background:"#0f172a", border:"1px solid #334155", color:"#94a3b8", borderRadius:8, padding:"10px 0", fontSize:12, cursor:"pointer" }}>← Deseleziona</button>
                    {cart.length>0 && (
                      <button onClick={sendToTable} disabled={sending} style={{ flex:2, background:"#92400e", border:"none", color:"#fcd34d", borderRadius:8, padding:"10px 0", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                        {sending?"Invio…":"📤 Invia al tavolo"}
                      </button>
                    )}
                  </div>
                  {cart.length>0 && (
                    <button onClick={()=>setPayModal(true)} style={{ background:"#16a34a", border:"none", color:"#fff", borderRadius:8, padding:"12px 0", fontSize:15, fontWeight:700, cursor:"pointer" }}>
                      🔒 Chiudi tavolo · {eur(totals.total)}
                    </button>
                  )}
                  {openInvId && cart.length===0 && (
                    <button onClick={()=>setPayModal(true)} style={{ background:"#16a34a", border:"none", color:"#fff", borderRadius:8, padding:"12px 0", fontSize:15, fontWeight:700, cursor:"pointer" }}>
                      🔒 Chiudi tavolo · {eur(invMap[selTable!.id]?.total ?? 0)}
                    </button>
                  )}
                </div>
              </>)}
            </div>
          </div>

          {/* Table bar */}
          <div style={{ height:90, minHeight:90, background:"#1e293b", borderTop:"2px solid #166534", flexShrink:0, display:"flex", alignItems:"center", padding:"0 12px", gap:8, overflowX:"auto" }}>
            <span style={{ color:"#4ade80", fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase", whiteSpace:"nowrap", marginRight:4 }}>Tavoli</span>
            {tables.filter(t=>t.active).map(t => {
              const inv = invMap[t.id]; const occupied = !!inv; const isActive = selTable?.id===t.id;
              const label = t.name.replace(/[^0-9]/g,"")||t.name;
              return (
                <button key={t.id} onClick={()=>selectTable(t)} title={t.name+(occupied?` — ${eur(inv.total)}`:" — Libero")}
                  style={{ minWidth:52, height:64, borderRadius:8, border:`2px solid ${isActive?"#fff":occupied?"#f59e0b":"#334155"}`, background:isActive?"#1d4ed8":occupied?"#92400e":"#0f172a", color:"#fff", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2, flexShrink:0 }}>
                  <span style={{ fontSize:18, fontWeight:700, lineHeight:1 }}>{label}</span>
                  {occupied ? <span style={{ fontSize:9, color:"#fcd34d", fontWeight:600 }}>{eur(inv.total)}</span> : <span style={{ fontSize:9, color:"#475569" }}>libero</span>}
                </button>
              );
            })}
            {tables.filter(t=>t.active).length===0 && <span style={{ color:"#475569", fontSize:12 }}>Nessun tavolo — aggiungili dalla tab Tavoli</span>}
          </div>

          {/* Payment modal */}
          {payModal && (
            <>
              <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.75)", zIndex:300 }} onClick={()=>!paying&&setPayModal(false)}/>
              <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", zIndex:301, background:"#1e293b", borderRadius:18, padding:28, width:340, boxShadow:"0 30px 80px #0009", display:"flex", flexDirection:"column", gap:16 }}>
                <div>
                  <p style={{ color:"#f1f5f9", fontWeight:700, fontSize:20, marginBottom:4 }}>Metodo di pagamento</p>
                  <p style={{ color:"#64748b", fontSize:13 }}>{selTable?.name} · {eur(cart.length>0?totals.total:(invMap[selTable!.id]?.total??0))}</p>
                </div>
                <div style={{ display:"flex", gap:12 }}>
                  {(["cash","card"] as const).map(m => (
                    <button key={m} onClick={()=>setPayMethod(m)}
                      style={{ flex:1, padding:"20px 0", borderRadius:12, fontSize:28, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:6, background:payMethod===m?"#1d4ed8":"#0f172a", border:`2px solid ${payMethod===m?"#60a5fa":"#334155"}`, color:"#fff" }}>
                      <span>{m==="cash"?"💵":"💳"}</span>
                      <span style={{ fontSize:12, fontWeight:600, color:payMethod===m?"#bfdbfe":"#64748b" }}>{m==="cash"?"Contanti":"Bancomat"}</span>
                    </button>
                  ))}
                </div>
                {payErr && <p style={{ color:"#f87171", fontSize:12, textAlign:"center" }}>{payErr}</p>}
                <button onClick={()=>closeTable(payMethod)} disabled={paying}
                  style={{ padding:"16px 0", background:"#16a34a", color:"#fff", border:"none", borderRadius:12, fontSize:17, fontWeight:700, cursor:paying?"wait":"pointer" }}>
                  {paying ? "Salvo…" : `✅ Conferma pagamento${payMethod==="cash"?" — Contanti":" — Bancomat"}`}
                </button>
                <button onClick={()=>setPayModal(false)} disabled={paying}
                  style={{ padding:"10px 0", background:"transparent", color:"#64748b", border:"none", fontSize:13, cursor:"pointer" }}>
                  Annulla
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── SHOP TABS ── */}
      {!isCassa && (
        <div style={{ flex:1, overflowY:"auto" }}>
          <div style={{ maxWidth:1200, margin:"0 auto", padding:20 }}>
            {tab==="orders"  && <OrdersTab role={user.role} slug={slug} activeShift={activeShift} onShiftUpdated={fetchActiveShift} staffUser={user}/>}
            {tab==="shift"   && user.role==="delivery" && <ShiftTab slug={slug} staffId={String(user.id)} staffName={user.name}/>}
            {tab==="shifts"      && user.role==="admin" && <AdminShiftsTab slug={slug}/>}
            {tab==="menu"        && user.role==="admin" && <MenuTab slug={slug}/>}
            {tab==="tables"      && user.role==="admin" && <TablesTab slug={slug}/>}
            {tab==="settings"    && user.role==="admin" && <SettingsTab slug={slug}/>}
          </div>
        </div>
      )}

      <style>{shopStyles}</style>
    </div>
  );
}

const shopStyles = `
*{box-sizing:border-box;margin:0;padding:0}
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
.order-client__link{font-size:.82rem;color:#3A3A36;text-decoration:none}
.order-client__link:hover{color:#B03A2E}
.order-items{list-style:none;display:flex;flex-direction:column;gap:3px}
.order-item{display:flex;align-items:baseline;gap:6px;font-size:.87rem}
.order-item__qty{font-weight:700;color:#B03A2E;min-width:20px}
.order-item__name{flex:1;color:#1C1C1A}
.order-item__price{color:#7A7770;white-space:nowrap}
.order-total{display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px solid #EDE0CC;font-size:.82rem;font-weight:500;color:#7A7770}
.order-total__amt{font-family:Georgia,serif;font-size:1.15rem;font-weight:700;color:#1C1C1A}
.order-actions{display:flex;gap:8px;flex-wrap:wrap}
.action-btn{flex:1;padding:10px;border:none;border-radius:10px;font-size:.85rem;font-weight:500;cursor:pointer;min-width:120px}
.action-btn--ready{background:#4CAF50;color:#fff}
.action-btn--delivered{background:#1C1C1A;color:#FDF6EC}
.settings-card{background:#fff;border:1px solid #EDE0CC;border-radius:14px;overflow:hidden}
.settings-card__head{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;gap:12px;flex-wrap:wrap}
.settings-card__title{font-family:Georgia,serif;font-size:1rem;font-weight:700;color:#1C1C1A;margin-bottom:3px}
.settings-card__sub{font-size:.78rem;color:#7A7770}
.settings-card__warning{padding:12px 20px;background:#FFF3CD;border-top:1px solid #FFE082;font-size:.82rem;color:#7A5200;font-weight:500}
.toggle-btn{display:flex;align-items:center;gap:8px;padding:10px 16px;border:none;border-radius:999px;cursor:pointer;font-size:.88rem;font-weight:500;flex-shrink:0}
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
.cat-name-input:focus,.emoji-input:focus{outline:none;border-color:#B03A2E}
.btn-confirm{padding:9px 16px;background:#B03A2E;color:#fff;border:none;border-radius:8px;font-size:.85rem;font-weight:500;cursor:pointer}
.btn-cancel{padding:9px 16px;background:transparent;color:#7A7770;border:1px solid #EDE0CC;border-radius:8px;font-size:.85rem;cursor:pointer}
.menu-section{background:#fff;border:1px solid #EDE0CC;border-radius:12px;overflow:hidden}
.menu-section__head{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#F5EADA;border-bottom:1px solid #EDE0CC;flex-wrap:wrap;gap:8px}
.menu-section__title{font-family:Georgia,serif;font-size:1rem;font-weight:700;color:#1C1C1A}
.btn-sm{padding:5px 10px;border:1px solid #EDE0CC;background:#fff;border-radius:6px;font-size:.75rem;cursor:pointer;white-space:nowrap}
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
.modal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:201;background:#fff;border-radius:16px;width:90%;max-width:440px;box-shadow:0 20px 60px rgba(0,0,0,.2);max-height:90vh;overflow-y:auto}
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
.opt-add-btn{background:transparent;border:1px dashed #EDE0CC;border-radius:6px;padding:5px 10px;font-size:.78rem;color:#7A7770;cursor:pointer;font-family:inherit;text-align:left;width:fit-content}
.opt-add-btn:hover{border-color:#B03A2E;color:#B03A2E}
.handover-banner{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;background:#FEF3DB;border:1.5px solid #F9DC7D;border-radius:12px;flex-wrap:wrap}
.handover-banner__title{font-size:.9rem;font-weight:600;color:#8A5E12;margin-bottom:3px}
.handover-banner__sub{font-size:.8rem;color:#8A5E12}
`;
