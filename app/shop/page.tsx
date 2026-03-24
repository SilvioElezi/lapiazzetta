"use client";
import { useEffect, useState, useCallback } from "react";

type OrderItem = { id: string; name: string; qty: number; price: number };
type Order = { id: string; clientName: string; phone: string; address: string; lat?: number; lng?: number; items: OrderItem[]; total: number; status: "new" | "ready"; placedAt: string };
type MenuItem = { id: string; name: string; ingredients: string; price: number; popular: boolean; spicy: boolean; vegetarian: boolean; description?: string; active: boolean };
type MenuCategory = { category: string; emoji: string; items: MenuItem[] };

const SHOP_PASSWORD = process.env.NEXT_PUBLIC_SHOP_PASSWORD ?? "piazzetta2024";

function elapsed(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "adesso";
  if (mins === 1) return "1 min fa";
  return `${mins} min fa`;
}
function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

// ─── ORDERS TAB ───────────────────────────────────────────
function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const fetchOrders = useCallback(async () => {
    try { const r = await fetch("/api/orders"); setOrders(await r.json()); } catch {}
  }, []);
  useEffect(() => {
    fetchOrders();
    const poll = setInterval(fetchOrders, 3000);
    return () => clearInterval(poll);
  }, [fetchOrders]);
  const markReady     = async (id: string) => { await fetch(`/api/order/${id}`, { method: "PATCH" });  fetchOrders(); };
  const markDelivered = async (id: string) => { await fetch(`/api/order/${id}`, { method: "DELETE" }); fetchOrders(); };
  const newOrders   = orders.filter((o) => o.status === "new");
  const readyOrders = orders.filter((o) => o.status === "ready");
  return (
    <div className="tab-content">
      <div className="orders-stats">
        <span className="stat-pill stat-pill--new">🆕 {newOrders.length} nuovi</span>
        <span className="stat-pill stat-pill--ready">✅ {readyOrders.length} pronti</span>
        <span className="shop__live">● Live</span>
      </div>
      {orders.length === 0 ? (
        <div className="empty-state"><span>🍃</span><p>Nessun ordine attivo</p><small>Gli ordini appariranno automaticamente</small></div>
      ) : (
        <div className="orders-grid">
          {orders.map((order) => (
            <div key={order.id} className={`order-card${order.status === "ready" ? " order-card--ready" : ""}`}>
              <div className="order-card__head">
                <div>
                  <span className="order-id">#{order.id}</span>
                  <span className={`status-badge${order.status === "ready" ? " status-badge--ready" : ""}`}>
                    {order.status === "new" ? "Nuovo" : "Pronto 🛵"}
                  </span>
                </div>
                <span className="order-time">{elapsed(order.placedAt)}</span>
              </div>
              <div className="order-client">
                <p className="order-client__name">{order.clientName}</p>
                <a href={`tel:${order.phone}`} className="order-client__link">📞 {order.phone}</a>
                <a href={order.lat ? `https://maps.google.com/?q=${order.lat},${order.lng}` : `https://maps.google.com/?q=${encodeURIComponent(order.address)}`} target="_blank" rel="noopener noreferrer" className="order-client__link">📍 {order.address}</a>
              </div>
              <ul className="order-items">
                {order.items.map((item) => (
                  <li key={item.id} className="order-item">
                    <span className="order-item__qty">{item.qty}×</span>
                    <span className="order-item__name">{item.name}</span>
                    <span className="order-item__price">€{(item.price * item.qty).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="order-total"><span>Totale</span><span className="order-total__amt">€{order.total.toFixed(2)}</span></div>
              <div className="order-actions">
                {order.status === "new"   && <button className="action-btn action-btn--ready"     onClick={() => markReady(order.id)}>✅ Ordine pronto</button>}
                {order.status === "ready" && <button className="action-btn action-btn--delivered" onClick={() => markDelivered(order.id)}>🛵 Consegnato</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MENU TAB ─────────────────────────────────────────────
function MenuTab() {
  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingItem, setEditingItem] = useState<{ catIdx: number; itemIdx: number | null } | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [newCatEmoji, setNewCatEmoji] = useState("🍕");
  const [showNewCat, setShowNewCat] = useState(false);
  const blankItem = (): MenuItem => ({ id: newId(), name: "", ingredients: "", price: 0, popular: false, spicy: false, vegetarian: false, active: true });
  const [draft, setDraft] = useState<MenuItem>(blankItem());

  useEffect(() => { fetch("/api/menu").then((r) => r.json()).then(setMenu).catch(() => {}); }, []);

  const saveMenu = async (updated: MenuCategory[]) => {
    setSaving(true);
    await fetch("/api/menu", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  const toggleActive = (catIdx: number, itemIdx: number) => {
    const updated = menu.map((cat, ci) => ci !== catIdx ? cat : { ...cat, items: cat.items.map((item, ii) => ii !== itemIdx ? item : { ...item, active: !item.active }) });
    setMenu(updated); saveMenu(updated);
  };
  const deleteItem = (catIdx: number, itemIdx: number) => {
    if (!confirm("Eliminare questo prodotto?")) return;
    const updated = menu.map((cat, ci) => ci !== catIdx ? cat : { ...cat, items: cat.items.filter((_, ii) => ii !== itemIdx) });
    setMenu(updated); saveMenu(updated);
  };
  const deleteCategory = (catIdx: number) => {
    if (!confirm(`Eliminare la categoria "${menu[catIdx].category}"?`)) return;
    const updated = menu.filter((_, ci) => ci !== catIdx);
    setMenu(updated); saveMenu(updated);
  };
  const openEdit = (catIdx: number, itemIdx: number | null) => {
    setEditingItem({ catIdx, itemIdx });
    setDraft(itemIdx === null ? blankItem() : { ...menu[catIdx].items[itemIdx] });
  };
  const saveItem = () => {
    if (!draft.name.trim() || !editingItem) return;
    const { catIdx, itemIdx } = editingItem;
    const updated = menu.map((cat, ci) => {
      if (ci !== catIdx) return cat;
      const items = itemIdx === null ? [...cat.items, draft] : cat.items.map((item, ii) => ii === itemIdx ? draft : item);
      return { ...cat, items };
    });
    setMenu(updated); saveMenu(updated); setEditingItem(null);
  };
  const addCategory = () => {
    if (!newCatName.trim()) return;
    const updated = [...menu, { category: newCatName.trim(), emoji: newCatEmoji, items: [] }];
    setMenu(updated); saveMenu(updated);
    setNewCatName(""); setNewCatEmoji("🍕"); setShowNewCat(false);
  };

  return (
    <div className="tab-content">
      <div className="menu-toolbar">
        <span className="menu-toolbar__title">{menu.reduce((s, c) => s + c.items.length, 0)} prodotti in {menu.length} categorie</span>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {saved   && <span className="saved-badge">✓ Salvato</span>}
          {saving  && <span className="saving-badge">Salvataggio…</span>}
          <button className="btn-add-cat" onClick={() => setShowNewCat(!showNewCat)}>+ Categoria</button>
        </div>
      </div>
      {showNewCat && (
        <div className="new-cat-form">
          <input value={newCatEmoji} onChange={(e) => setNewCatEmoji(e.target.value)} placeholder="🍕" className="emoji-input" />
          <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Nome categoria" className="cat-name-input" onKeyDown={(e) => e.key === "Enter" && addCategory()} />
          <button className="btn-confirm" onClick={addCategory}>Aggiungi</button>
          <button className="btn-cancel" onClick={() => setShowNewCat(false)}>Annulla</button>
        </div>
      )}
      {menu.map((cat, catIdx) => (
        <div key={cat.category} className="menu-section">
          <div className="menu-section__head">
            <h3 className="menu-section__title">{cat.emoji} {cat.category}</h3>
            <div style={{display:"flex",gap:6}}>
              <button className="btn-sm btn-sm--add" onClick={() => openEdit(catIdx, null)}>+ Prodotto</button>
              <button className="btn-sm btn-sm--del" onClick={() => deleteCategory(catIdx)}>🗑 Categoria</button>
            </div>
          </div>
          <div className="menu-items-list">
            {cat.items.map((item, itemIdx) => (
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
                  <button className="btn-sm btn-sm--edit" onClick={() => openEdit(catIdx, itemIdx)}>✏️ Modifica</button>
                  <button className="btn-sm" onClick={() => toggleActive(catIdx, itemIdx)}>{item.active ? "⏸ Disattiva" : "▶ Attiva"}</button>
                  <button className="btn-sm btn-sm--del" onClick={() => deleteItem(catIdx, itemIdx)}>🗑</button>
                </div>
              </div>
            ))}
            {cat.items.length === 0 && <p className="empty-cat">Nessun prodotto. Clicca &quot;+ Prodotto&quot; per aggiungerne uno.</p>}
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
              <label className="modal-field"><span>Nome *</span>
                <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Margherita" />
              </label>
              <label className="modal-field"><span>Ingredienti</span>
                <textarea value={draft.ingredients} onChange={(e) => setDraft({ ...draft, ingredients: e.target.value })} placeholder="Pomodoro, mozzarella…" rows={2} />
              </label>
              <label className="modal-field"><span>Descrizione breve (opzionale)</span>
                <input value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="La nostra pizza firma" />
              </label>
              <label className="modal-field"><span>Prezzo (€) *</span>
                <input type="number" step="0.5" min="0" value={draft.price} onChange={(e) => setDraft({ ...draft, price: parseFloat(e.target.value) || 0 })} />
              </label>
              <div className="modal-flags">
                {(["popular","spicy","vegetarian","active"] as const).map((flag) => (
                  <label key={flag} className="flag-toggle">
                    <input type="checkbox" checked={!!draft[flag]} onChange={(e) => setDraft({ ...draft, [flag]: e.target.checked })} />
                    <span>{{ popular:"⭐ Popolare", spicy:"🌶 Piccante", vegetarian:"🌿 Vegetariano", active:"✅ Attivo" }[flag]}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="modal__foot">
              <button className="btn-cancel-modal" onClick={() => setEditingItem(null)}>Annulla</button>
              <button className="btn-save-modal" onClick={saveItem} disabled={!draft.name.trim()}>Salva prodotto</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── ROOT PAGE ─────────────────────────────────────────────
export default function ShopPage() {
  // ✅ FIX: persist auth in localStorage so closing the tab doesn't log out
  const [authed, setAuthed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("shop_authed") === "1";
  });
  const [pwd, setPwd] = useState("");
  const [tab, setTab] = useState<"orders" | "menu">("orders");

  const login = () => {
    if (pwd === SHOP_PASSWORD) {
      localStorage.setItem("shop_authed", "1");
      setAuthed(true);
    }
  };

  const logout = () => {
    localStorage.removeItem("shop_authed");
    setAuthed(false);
    setPwd("");
  };

  if (!authed) return (
    <div className="login">
      <div className="login__card">
        <h1 className="login__title">🍕 La Piazzetta</h1>
        <p className="login__sub">Dashboard</p>
        <input
          type="password" placeholder="Password" value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && login()}
          className="login__input" autoFocus
        />
        <button className="login__btn" onClick={login}>Accedi</button>
        {pwd && pwd !== SHOP_PASSWORD && <p className="login__err">Password errata</p>}
      </div>
      <style>{styles}</style>
    </div>
  );

  return (
    <div className="shop">
      <header className="shop__header">
        <div className="shop__header-inner">
          <h1 className="shop__logo">🍕 La Piazzetta</h1>
          <nav className="shop__tabs">
            <button className={`shop__tab${tab === "orders" ? " shop__tab--active" : ""}`} onClick={() => setTab("orders")}>📋 Ordini</button>
            <button className={`shop__tab${tab === "menu" ? " shop__tab--active" : ""}`} onClick={() => setTab("menu")}>🍕 Menu</button>
            <button className="shop__tab shop__tab--logout" onClick={logout}>🚪 Esci</button>
          </nav>
        </div>
      </header>
      <main className="shop__main">
        {tab === "orders" ? <OrdersTab /> : <MenuTab />}
      </main>
      <style>{styles}</style>
    </div>
  );
}

const styles = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;background:#F5EADA}
.login{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#1C1C1A;padding:24px}
.login__card{background:#FDF6EC;border-radius:20px;padding:40px 32px;width:100%;max-width:360px;display:flex;flex-direction:column;gap:16px;box-shadow:0 20px 60px rgba(0,0,0,.4)}
.login__title{font-family:Georgia,serif;font-size:1.8rem;font-weight:700;color:#1C1C1A;text-align:center}
.login__sub{font-size:.82rem;color:#7A7770;text-align:center;margin-top:-8px}
.login__input{padding:12px 16px;border:1.5px solid #EDE0CC;border-radius:10px;font-size:.95rem;width:100%;outline:none}
.login__input:focus{border-color:#B03A2E}
.login__btn{padding:13px;background:#B03A2E;color:#fff;border:none;border-radius:10px;font-size:.95rem;font-weight:500;cursor:pointer;transition:background .15s}
.login__btn:hover{background:#C9503F}
.login__err{font-size:.8rem;color:#B03A2E;text-align:center}
.shop__header{background:#1C1C1A;position:sticky;top:0;z-index:10;box-shadow:0 2px 12px rgba(0,0,0,.2)}
.shop__header-inner{max-width:1100px;margin:0 auto;padding:0 20px;display:flex;align-items:center;gap:16px;height:56px}
.shop__logo{font-family:Georgia,serif;font-size:1.1rem;font-weight:700;color:#FDF6EC;flex:1}
.shop__tabs{display:flex;gap:4px}
.shop__tab{padding:7px 14px;background:rgba(253,246,236,.08);border:none;color:rgba(253,246,236,.6);border-radius:8px;cursor:pointer;font-size:.83rem;font-weight:500;transition:background .15s,color .15s}
.shop__tab:hover{background:rgba(253,246,236,.15);color:#FDF6EC}
.shop__tab--active{background:rgba(253,246,236,.18);color:#FDF6EC}
.shop__tab--logout{color:rgba(253,100,80,.7)}
.shop__tab--logout:hover{background:rgba(253,100,80,.12);color:#ff6450}
.shop__main{max-width:1100px;margin:0 auto;padding:20px}
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
.order-actions{display:flex;gap:8px}
.action-btn{flex:1;padding:10px;border:none;border-radius:10px;font-size:.87rem;font-weight:500;cursor:pointer;transition:opacity .15s,transform .15s}
.action-btn:hover{opacity:.88;transform:translateY(-1px)}
.action-btn--ready{background:#4CAF50;color:#fff}
.action-btn--delivered{background:#1C1C1A;color:#FDF6EC}
.menu-toolbar{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#fff;border:1px solid #EDE0CC;border-radius:12px}
.menu-toolbar__title{font-size:.85rem;color:#7A7770}
.saved-badge{font-size:.78rem;font-weight:500;color:#2E7D32;background:#EBF5EB;padding:4px 10px;border-radius:999px}
.saving-badge{font-size:.78rem;color:#7A7770}
.btn-add-cat{padding:8px 14px;background:#1C1C1A;color:#FDF6EC;border:none;border-radius:8px;font-size:.82rem;font-weight:500;cursor:pointer}
.btn-add-cat:hover{background:#3A3A36}
.new-cat-form{display:flex;gap:8px;align-items:center;padding:14px 16px;background:#fff;border:1px solid #EDE0CC;border-radius:12px;flex-wrap:wrap}
.emoji-input{width:50px;padding:8px;border:1.5px solid #EDE0CC;border-radius:8px;font-size:1.2rem;text-align:center}
.cat-name-input{flex:1;min-width:160px;padding:9px 12px;border:1.5px solid #EDE0CC;border-radius:8px;font-size:.9rem}
.cat-name-input:focus,.emoji-input:focus{outline:none;border-color:#B03A2E}
.btn-confirm{padding:9px 16px;background:#B03A2E;color:#fff;border:none;border-radius:8px;font-size:.85rem;font-weight:500;cursor:pointer}
.btn-cancel{padding:9px 16px;background:transparent;color:#7A7770;border:1px solid #EDE0CC;border-radius:8px;font-size:.85rem;cursor:pointer}
.menu-section{background:#fff;border:1px solid #EDE0CC;border-radius:12px;overflow:hidden}
.menu-section__head{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#F5EADA;border-bottom:1px solid #EDE0CC}
.menu-section__title{font-family:Georgia,serif;font-size:1rem;font-weight:700;color:#1C1C1A}
.btn-sm{padding:5px 10px;border:1px solid #EDE0CC;background:#fff;border-radius:6px;font-size:.75rem;cursor:pointer;white-space:nowrap;transition:background .15s}
.btn-sm:hover{background:#F5EADA}
.btn-sm--add{border-color:#B03A2E;color:#B03A2E}
.btn-sm--add:hover{background:#FFF0EE}
.btn-sm--del{border-color:#ffcdd2;color:#B71C1C}
.btn-sm--del:hover{background:#ffebee}
.btn-sm--edit{border-color:#B0BEC5;color:#455A64}
.menu-items-list{display:flex;flex-direction:column}
.menu-item-row{padding:12px 16px;border-bottom:1px solid #F5EADA;display:flex;flex-direction:column;gap:4px}
.menu-item-row:last-child{border-bottom:none}
.menu-item-row:hover{background:#FAFAF8}
.menu-item-row--inactive{opacity:.5}
.menu-item-row__main{display:flex;align-items:center;gap:8px}
.menu-item-row__name{font-size:.9rem;font-weight:500;color:#1C1C1A;flex:1}
.menu-item-row__price{font-size:.9rem;font-weight:600;color:#B03A2E;white-space:nowrap}
.menu-item-row__flags{display:flex;gap:4px}
.menu-item-row__ing{font-size:.78rem;color:#7A7770;line-height:1.4}
.menu-item-row__actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:2px}
.flag{font-size:.75rem}
.flag--off{background:#FDECEA;color:#B71C1C;font-size:.65rem;font-weight:600;padding:1px 6px;border-radius:4px}
.empty-cat{padding:12px 16px;font-size:.82rem;color:#B0ACA5;font-style:italic}
.modal-backdrop{position:fixed;inset:0;z-index:300;background:rgba(28,28,26,.5);backdrop-filter:blur(2px)}
.modal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:301;background:#fff;border-radius:16px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(28,28,26,.25)}
.modal__head{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #EDE0CC;position:sticky;top:0;background:#fff}
.modal__head h3{font-family:Georgia,serif;font-size:1.05rem;font-weight:700;color:#1C1C1A}
.modal__head button{background:none;border:none;font-size:1.1rem;cursor:pointer;color:#7A7770}
.modal__body{padding:20px;display:flex;flex-direction:column;gap:14px}
.modal__foot{padding:16px 20px;border-top:1px solid #EDE0CC;display:flex;gap:8px;justify-content:flex-end;position:sticky;bottom:0;background:#fff}
.modal-field{display:flex;flex-direction:column;gap:5px}
.modal-field>span{font-size:.72rem;font-weight:500;text-transform:uppercase;letter-spacing:.06em;color:#7A7770}
.modal-field input,.modal-field textarea{padding:10px 12px;border:1.5px solid #EDE0CC;border-radius:8px;font-size:.9rem;font-family:inherit;resize:vertical;transition:border-color .15s}
.modal-field input:focus,.modal-field textarea:focus{outline:none;border-color:#B03A2E}
.modal-flags{display:flex;flex-wrap:wrap;gap:10px}
.flag-toggle{display:flex;align-items:center;gap:6px;cursor:pointer;font-size:.85rem;color:#3A3A36;user-select:none}
.flag-toggle input{width:16px;height:16px;cursor:pointer;accent-color:#B03A2E}
.btn-cancel-modal{padding:10px 18px;background:transparent;border:1px solid #EDE0CC;border-radius:8px;font-size:.88rem;cursor:pointer;color:#7A7770}
.btn-save-modal{padding:10px 20px;background:#B03A2E;color:#fff;border:none;border-radius:8px;font-size:.88rem;font-weight:500;cursor:pointer}
.btn-save-modal:hover:not(:disabled){background:#C9503F}
.btn-save-modal:disabled{opacity:.5;cursor:not-allowed}
`;
