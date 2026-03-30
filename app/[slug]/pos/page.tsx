"use client";
import { use, useEffect, useState, useCallback, useMemo } from "react";
import type { StaffUser, KioskTable } from "../../../lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────
type Article = {
  id: string;
  code: string;
  name: string;
  price: number;
  category: string | null;
  vat_rate: number;
};

type CartItem = {
  article: Article;
  qty: number;
};

type OpenInvoice = {
  id: string;
  table_id: string | null;
  total: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function eur(n: number) {
  return "€\u00a0" + n.toFixed(2).replace(".", ",");
}

function categoryLabel(cat: string | null) {
  if (!cat || cat === "0") return "Varie";
  return `Cat. ${cat}`;
}

function calcTotals(cart: CartItem[]) {
  const total    = cart.reduce((s, c) => s + c.article.price * c.qty, 0);
  // Group VAT by rate (prices are VAT-inclusive)
  const vatBreakdown: Record<number, number> = {};
  for (const c of cart) {
    const rate   = c.article.vat_rate;
    const vatAmt = (c.article.price * c.qty) * rate / (100 + rate);
    vatBreakdown[rate] = (vatBreakdown[rate] ?? 0) + vatAmt;
  }
  const vat_amount = Object.values(vatBreakdown).reduce((s, v) => s + v, 0);
  const subtotal   = total - vat_amount;
  return { total, subtotal, vat_amount, vatBreakdown };
}

// ─── Login ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, slug }: { onLogin: (u: StaffUser) => void; slug: string }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const login = async () => {
    if (!username || !password) return;
    setLoading(true); setError("");
    try {
      const res  = await fetch(`/${slug}/api/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Errore");
      else {
        const user = { ...data.user, businesses: data.businesses ?? [] };
        localStorage.setItem("shop_user", JSON.stringify(user));
        onLogin(user);
      }
    } catch { setError("Errore di connessione"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#0f172a" }}>
      <div style={{ background:"#1e293b", borderRadius:16, padding:40, width:340, boxShadow:"0 25px 50px #0008" }}>
        <div style={{ fontSize:48, textAlign:"center", marginBottom:8 }}>🍕</div>
        <h1 style={{ color:"#f1f5f9", textAlign:"center", fontSize:22, fontWeight:700, margin:"0 0 4px" }}>Cassa POS</h1>
        <p style={{ color:"#64748b", textAlign:"center", fontSize:13, marginBottom:28 }}>Accesso riservato al personale</p>
        <input
          style={{ width:"100%", background:"#0f172a", border:"1px solid #334155", borderRadius:8, padding:"10px 14px", color:"#f1f5f9", fontSize:15, marginBottom:12, boxSizing:"border-box" }}
          placeholder="Username" value={username} autoFocus
          onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === "Enter" && login()}
        />
        <input
          style={{ width:"100%", background:"#0f172a", border:"1px solid #334155", borderRadius:8, padding:"10px 14px", color:"#f1f5f9", fontSize:15, marginBottom:20, boxSizing:"border-box" }}
          placeholder="Password" type="password" value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && login()}
        />
        <button
          onClick={login} disabled={loading}
          style={{ width:"100%", background:"#3b82f6", color:"#fff", border:"none", borderRadius:8, padding:"12px 0", fontSize:15, fontWeight:600, cursor:"pointer" }}
        >
          {loading ? "Accesso…" : "Accedi"}
        </button>
        {error && <p style={{ color:"#f87171", textAlign:"center", marginTop:12, fontSize:13 }}>{error}</p>}
      </div>
    </div>
  );
}

// ─── Table Grid ───────────────────────────────────────────────────────────────
function TableGrid({
  tables, openInvoices, onSelect, onRefresh,
}: {
  tables: KioskTable[];
  openInvoices: OpenInvoice[];
  onSelect: (t: KioskTable) => void;
  onRefresh: () => void;
}) {
  const invoiceMap = useMemo(() => {
    const m: Record<string, OpenInvoice> = {};
    for (const inv of openInvoices) if (inv.table_id) m[inv.table_id] = inv;
    return m;
  }, [openInvoices]);

  return (
    <div style={{ padding:24 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h2 style={{ color:"#f1f5f9", fontSize:20, fontWeight:700, margin:0 }}>Tavoli</h2>
        <button onClick={onRefresh} style={{ background:"#1e293b", border:"1px solid #334155", color:"#94a3b8", borderRadius:8, padding:"6px 14px", cursor:"pointer", fontSize:13 }}>
          ↺ Aggiorna
        </button>
      </div>
      {tables.length === 0 && (
        <p style={{ color:"#64748b", textAlign:"center", marginTop:60 }}>
          Nessun tavolo configurato. Aggiungili dal pannello Staff.
        </p>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:16 }}>
        {tables.filter(t => t.active).map(t => {
          const inv     = invoiceMap[t.id];
          const occupied = !!inv;
          return (
            <button
              key={t.id}
              onClick={() => onSelect(t)}
              style={{
                background:  occupied ? "#1e3a2e" : "#1e293b",
                border:      `2px solid ${occupied ? "#22c55e" : "#334155"}`,
                borderRadius: 12,
                padding:     "20px 16px",
                cursor:      "pointer",
                textAlign:   "center",
                transition:  "transform 0.1s",
              }}
            >
              <div style={{ fontSize:32, marginBottom:6 }}>🪑</div>
              <div style={{ color:"#f1f5f9", fontWeight:700, fontSize:16 }}>{t.name}</div>
              {occupied
                ? <div style={{ color:"#22c55e", fontSize:13, marginTop:4, fontWeight:600 }}>{eur(inv.total)}</div>
                : <div style={{ color:"#475569", fontSize:12, marginTop:4 }}>Libero</div>
              }
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── POS View ─────────────────────────────────────────────────────────────────
function POSView({
  table, articles, onBack, onPaid, slug, staffId,
}: {
  table: KioskTable;
  articles: Article[];
  onBack: () => void;
  onPaid: () => void;
  slug: string;
  staffId: number;
}) {
  const [cart,        setCart]        = useState<CartItem[]>([]);
  const [search,      setSearch]      = useState("");
  const [selCategory, setSelCategory] = useState<string>("all");
  const [paying,      setPaying]      = useState(false);
  const [payError,    setPayError]    = useState("");
  const [payMethod,   setPayMethod]   = useState<"cash"|"card">("cash");

  // Build category list
  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const a of articles) seen.add(a.category ?? "0");
    return Array.from(seen).sort((a, b) => Number(a) - Number(b));
  }, [articles]);

  // Filtered articles
  const filtered = useMemo(() => {
    return articles.filter(a => {
      const matchCat = selCategory === "all" || a.category === selCategory;
      const matchQ   = !search || a.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchQ;
    });
  }, [articles, selCategory, search]);

  const totals = useMemo(() => calcTotals(cart), [cart]);

  function addArticle(a: Article) {
    setCart(prev => {
      const idx = prev.findIndex(c => c.article.id === a.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, { article: a, qty: 1 }];
    });
  }

  function changeQty(articleId: string, delta: number) {
    setCart(prev => {
      const next = prev.map(c =>
        c.article.id === articleId ? { ...c, qty: c.qty + delta } : c
      ).filter(c => c.qty > 0);
      return next;
    });
  }

  async function handlePay() {
    if (cart.length === 0) return;
    setPaying(true); setPayError("");
    try {
      const res = await fetch(`/${slug}/api/pos/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_id:     table.id,
          employee_id:  staffId,
          items:        cart.map(c => ({
            article_id:   c.article.id,
            article_code: c.article.code,
            article_name: c.article.name,
            quantity:     c.qty,
            unit_price:   c.article.price,
            vat_rate:     c.article.vat_rate,
            total_price:  +(c.article.price * c.qty).toFixed(2),
          })),
          subtotal:     +totals.subtotal.toFixed(2),
          vat_amount:   +totals.vat_amount.toFixed(2),
          total:        +totals.total.toFixed(2),
          status:       "paid",
          payment_method: payMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setPayError(data.error ?? "Errore"); return; }
      onPaid();
    } catch { setPayError("Errore di connessione"); }
    finally { setPaying(false); }
  }

  return (
    <div style={{ display:"flex", height:"calc(100vh - 56px)", overflow:"hidden" }}>

      {/* ── Left: Article selector ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", borderRight:"1px solid #1e293b", overflow:"hidden" }}>

        {/* Search */}
        <div style={{ padding:"12px 16px", borderBottom:"1px solid #1e293b" }}>
          <input
            style={{ width:"100%", background:"#1e293b", border:"1px solid #334155", borderRadius:8, padding:"8px 12px", color:"#f1f5f9", fontSize:14, boxSizing:"border-box" }}
            placeholder="🔍 Cerca articolo…"
            value={search}
            onChange={e => { setSearch(e.target.value); setSelCategory("all"); }}
          />
        </div>

        {/* Category pills */}
        <div style={{ display:"flex", gap:8, padding:"10px 16px", overflowX:"auto", borderBottom:"1px solid #1e293b", flexShrink:0 }}>
          {[{ id:"all", label:"Tutti" }, ...categories.map(c => ({ id:c, label:categoryLabel(c) }))].map(cat => (
            <button
              key={cat.id}
              onClick={() => { setSelCategory(cat.id); setSearch(""); }}
              style={{
                background:   selCategory === cat.id ? "#3b82f6" : "#1e293b",
                color:        selCategory === cat.id ? "#fff" : "#94a3b8",
                border:       `1px solid ${selCategory === cat.id ? "#3b82f6" : "#334155"}`,
                borderRadius: 20,
                padding:      "5px 14px",
                fontSize:     13,
                cursor:       "pointer",
                whiteSpace:   "nowrap",
                fontWeight:   selCategory === cat.id ? 600 : 400,
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Article grid */}
        <div style={{ flex:1, overflowY:"auto", padding:16, display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:10, alignContent:"start" }}>
          {filtered.map(a => (
            <button
              key={a.id}
              onClick={() => addArticle(a)}
              style={{
                background:   "#1e293b",
                border:       "1px solid #334155",
                borderRadius: 10,
                padding:      "12px 10px",
                cursor:       "pointer",
                textAlign:    "center",
                transition:   "background 0.1s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#263548")}
              onMouseLeave={e => (e.currentTarget.style.background = "#1e293b")}
            >
              <div style={{ color:"#f1f5f9", fontSize:13, fontWeight:600, marginBottom:6, lineHeight:1.3 }}>{a.name}</div>
              <div style={{ color:"#3b82f6", fontSize:14, fontWeight:700 }}>{eur(a.price)}</div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p style={{ color:"#475569", gridColumn:"1/-1", textAlign:"center", marginTop:40 }}>Nessun articolo trovato</p>
          )}
        </div>
      </div>

      {/* ── Right: Invoice panel ── */}
      <div style={{ width:320, display:"flex", flexDirection:"column", background:"#0f172a" }}>

        {/* Table header */}
        <div style={{ padding:"12px 16px", borderBottom:"1px solid #1e293b", background:"#1e293b" }}>
          <div style={{ color:"#94a3b8", fontSize:12, marginBottom:2 }}>CONTO</div>
          <div style={{ color:"#f1f5f9", fontSize:18, fontWeight:700 }}>{table.name}</div>
        </div>

        {/* Cart items */}
        <div style={{ flex:1, overflowY:"auto", padding:12 }}>
          {cart.length === 0 && (
            <p style={{ color:"#475569", textAlign:"center", marginTop:40, fontSize:13 }}>
              Seleziona articoli dal menu
            </p>
          )}
          {cart.map(c => (
            <div
              key={c.article.id}
              style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 0", borderBottom:"1px solid #1e293b" }}
            >
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ color:"#f1f5f9", fontSize:13, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.article.name}</div>
                <div style={{ color:"#475569", fontSize:12 }}>{eur(c.article.price)} × {c.qty}</div>
              </div>
              <div style={{ color:"#f1f5f9", fontSize:14, fontWeight:600, minWidth:54, textAlign:"right" }}>
                {eur(c.article.price * c.qty)}
              </div>
              <div style={{ display:"flex", gap:4 }}>
                <button onClick={() => changeQty(c.article.id, -1)}
                  style={{ background:"#1e293b", border:"1px solid #334155", color:"#f87171", borderRadius:6, width:26, height:26, cursor:"pointer", fontSize:16, lineHeight:1 }}>−</button>
                <button onClick={() => changeQty(c.article.id, 1)}
                  style={{ background:"#1e293b", border:"1px solid #334155", color:"#4ade80", borderRadius:6, width:26, height:26, cursor:"pointer", fontSize:16, lineHeight:1 }}>+</button>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        {cart.length > 0 && (
          <div style={{ padding:"12px 16px", borderTop:"1px solid #1e293b", background:"#1e293b" }}>
            <div style={{ display:"flex", justifyContent:"space-between", color:"#94a3b8", fontSize:13, marginBottom:4 }}>
              <span>Imponibile</span><span>{eur(totals.subtotal)}</span>
            </div>
            {Object.entries(totals.vatBreakdown).map(([rate, amt]) => (
              <div key={rate} style={{ display:"flex", justifyContent:"space-between", color:"#94a3b8", fontSize:12, marginBottom:2 }}>
                <span>IVA {rate}%</span><span>{eur(amt)}</span>
              </div>
            ))}
            <div style={{ display:"flex", justifyContent:"space-between", color:"#f1f5f9", fontSize:18, fontWeight:700, borderTop:"1px solid #334155", paddingTop:8, marginTop:6 }}>
              <span>TOTALE</span><span>{eur(totals.total)}</span>
            </div>
          </div>
        )}

        {/* Payment method toggle */}
        {cart.length > 0 && (
          <div style={{ display:"flex", gap:8, padding:"10px 16px", borderTop:"1px solid #1e293b" }}>
            {(["cash","card"] as const).map(m => (
              <button key={m}
                onClick={() => setPayMethod(m)}
                style={{
                  flex:1, padding:"8px 0", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer",
                  background:   payMethod === m ? "#3b82f6" : "#1e293b",
                  color:        payMethod === m ? "#fff" : "#64748b",
                  border:       `1px solid ${payMethod === m ? "#3b82f6" : "#334155"}`,
                }}
              >
                {m === "cash" ? "💵 Contanti" : "💳 Carta"}
              </button>
            ))}
          </div>
        )}

        {payError && <p style={{ color:"#f87171", textAlign:"center", fontSize:12, margin:"0 16px 8px" }}>{payError}</p>}

        {/* Action buttons */}
        <div style={{ display:"flex", gap:10, padding:"12px 16px", borderTop:"1px solid #1e293b" }}>
          <button
            onClick={onBack}
            style={{ flex:1, background:"#1e293b", border:"1px solid #334155", color:"#94a3b8", borderRadius:10, padding:"12px 0", fontSize:14, cursor:"pointer", fontWeight:500 }}
          >
            ← Tavoli
          </button>
          <button
            onClick={handlePay}
            disabled={paying || cart.length === 0}
            style={{
              flex:2, background: cart.length > 0 ? "#16a34a" : "#1e293b",
              border:"none", color: cart.length > 0 ? "#fff" : "#475569",
              borderRadius:10, padding:"12px 0", fontSize:15, cursor: cart.length > 0 ? "pointer" : "not-allowed",
              fontWeight:700,
            }}
          >
            {paying ? "Salvataggio…" : `💰 Paga ${cart.length > 0 ? eur(totals.total) : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function POSPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [user,         setUser]         = useState<StaffUser | null>(null);
  const [authChecked,  setAuthChecked]  = useState(false);
  const [view,         setView]         = useState<"tables" | "pos">("tables");
  const [tables,       setTables]       = useState<KioskTable[]>([]);
  const [openInvoices, setOpenInvoices] = useState<OpenInvoice[]>([]);
  const [articles,     setArticles]     = useState<Article[]>([]);
  const [selectedTable,setSelectedTable]= useState<KioskTable | null>(null);
  const [loading,      setLoading]      = useState(false);

  // Auth check on mount
  useEffect(() => {
    const stored = localStorage.getItem("shop_user");
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
    setAuthChecked(true);
  }, []);

  const loadTables = useCallback(async () => {
    const [tRes, iRes] = await Promise.all([
      fetch(`/${slug}/api/tables`),
      fetch(`/${slug}/api/pos/invoices`),
    ]);
    if (tRes.ok) { const d = await tRes.json(); setTables(d.tables ?? []); }
    if (iRes.ok) { const d = await iRes.json(); setOpenInvoices(d.invoices ?? []); }
  }, [slug]);

  const loadArticles = useCallback(async () => {
    const res = await fetch(`/${slug}/api/pos/articles`);
    if (res.ok) { const d = await res.json(); setArticles(d.articles ?? []); }
  }, [slug]);

  // Load data once authenticated
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([loadTables(), loadArticles()]).finally(() => setLoading(false));
  }, [user, loadTables, loadArticles]);

  function handleLogout() {
    localStorage.removeItem("shop_user");
    setUser(null);
  }

  function handleSelectTable(t: KioskTable) {
    setSelectedTable(t);
    setView("pos");
  }

  function handlePaid() {
    setView("tables");
    setSelectedTable(null);
    loadTables();
  }

  function handleBack() {
    setView("tables");
    setSelectedTable(null);
    loadTables();
  }

  if (!authChecked) return null;
  if (!user) return <LoginScreen onLogin={setUser} slug={slug} />;

  return (
    <div style={{ minHeight:"100vh", background:"#0f172a", color:"#f1f5f9", fontFamily:"system-ui,sans-serif" }}>

      {/* Header */}
      <header style={{ height:56, background:"#1e293b", borderBottom:"1px solid #0f172a", display:"flex", alignItems:"center", padding:"0 20px", gap:16 }}>
        <span style={{ fontSize:20 }}>🍕</span>
        <span style={{ fontWeight:700, fontSize:16, color:"#f1f5f9", flex:1 }}>
          {view === "pos" && selectedTable ? `POS — ${selectedTable.name}` : "La Piazzetta · Cassa POS"}
        </span>
        <span style={{ color:"#64748b", fontSize:13 }}>{user.name}</span>
        <a href={`/${slug}/shop`} style={{ color:"#64748b", fontSize:13, textDecoration:"none" }}>Dashboard</a>
        <button
          onClick={handleLogout}
          style={{ background:"none", border:"1px solid #334155", color:"#94a3b8", borderRadius:6, padding:"4px 10px", cursor:"pointer", fontSize:12 }}
        >
          Esci
        </button>
      </header>

      {/* Content */}
      {loading ? (
        <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:"calc(100vh - 56px)", color:"#64748b" }}>
          Caricamento…
        </div>
      ) : view === "tables" ? (
        <TableGrid
          tables={tables}
          openInvoices={openInvoices}
          onSelect={handleSelectTable}
          onRefresh={loadTables}
        />
      ) : selectedTable ? (
        <POSView
          table={selectedTable}
          articles={articles}
          onBack={handleBack}
          onPaid={handlePaid}
          slug={slug}
          staffId={user.id}
        />
      ) : null}
    </div>
  );
}
