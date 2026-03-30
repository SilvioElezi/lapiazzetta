"use client";
import { use, useEffect, useState, useCallback, useMemo } from "react";
import type { StaffUser, KioskTable } from "../../../lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────
type Article  = { id: string; code: string; name: string; price: number; category: string; vat_rate: number; };
type CartItem = { article: Article; qty: number; };
type OpenInv  = { id: string; table_id: string | null; total: number; };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const eur = (n: number) => "€ " + n.toFixed(2).replace(".", ",");

// BarPRO porosi_id → Italian category label
const BP_CAT: Record<string, string> = {
  "1":"Caffetteria","2":"Bibite","3":"Birra","4":"Gin / Tequila",
  "5":"Whisky","6":"Vodka","7":"Amaro","8":"Vino","9":"Liquori",
  "10":"Cognac","11":"Rum","12":"Long Drinks","13":"Cocktail","14":"Shots","0":"Varie",
};
function catLabel(c: string) {
  if (c.startsWith("bp_"))   return BP_CAT[c.slice(3)] ?? `Cat. ${c.slice(3)}`;
  if (c.startsWith("menu_")) return c.slice(5); // "menu_Pizza" → "Pizza"
  return c;
}

function calcTotals(cart: CartItem[]) {
  const total      = cart.reduce((s, c) => s + c.article.price * c.qty, 0);
  const vatByRate: Record<number, number> = {};
  for (const c of cart) {
    const r = c.article.vat_rate;
    vatByRate[r] = (vatByRate[r] ?? 0) + (c.article.price * c.qty) * r / (100 + r);
  }
  const vat_amount = Object.values(vatByRate).reduce((s, v) => s + v, 0);
  return { total, subtotal: total - vat_amount, vat_amount, vatByRate };
}

// ─── Login ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, slug }: { onLogin: (u: StaffUser) => void; slug: string }) {
  const [u, setU] = useState(""); const [p, setP] = useState("");
  const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);
  const login = async () => {
    if (!u || !p) return; setLoading(true); setErr("");
    try {
      const res = await fetch(`/${slug}/api/auth`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ username:u, password:p }) });
      const d = await res.json();
      if (!res.ok) { setErr(d.error ?? "Errore"); }
      else { const user = { ...d.user, businesses: d.businesses ?? [] }; localStorage.setItem("shop_user", JSON.stringify(user)); onLogin(user); }
    } catch { setErr("Errore di connessione"); } finally { setLoading(false); }
  };
  const S: React.CSSProperties = { width:"100%", background:"#0f172a", border:"1px solid #334155", borderRadius:8, padding:"10px 14px", color:"#f1f5f9", fontSize:15, marginBottom:12, boxSizing:"border-box" };
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#0f172a" }}>
      <div style={{ background:"#1e293b", borderRadius:16, padding:40, width:340, boxShadow:"0 25px 50px #0008" }}>
        <div style={{ fontSize:48, textAlign:"center", marginBottom:8 }}>🍕</div>
        <h1 style={{ color:"#f1f5f9", textAlign:"center", fontSize:22, fontWeight:700, margin:"0 0 24px" }}>Cassa POS</h1>
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

// ─── Main POS layout ──────────────────────────────────────────────────────────
export default function POSPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [user,          setUser]          = useState<StaffUser | null>(null);
  const [authChecked,   setAuthChecked]   = useState(false);
  const [tables,        setTables]        = useState<KioskTable[]>([]);
  const [openInvoices,  setOpenInvoices]  = useState<OpenInv[]>([]);
  const [articles,      setArticles]      = useState<Article[]>([]);
  const [categories,    setCategories]    = useState<string[]>([]);
  const [selCat,        setSelCat]        = useState<string>("all");
  const [search,        setSearch]        = useState("");
  const [selTable,      setSelTable]      = useState<KioskTable | null>(null);
  const [cart,          setCart]          = useState<CartItem[]>([]);
  const [payMethod,     setPayMethod]     = useState<"cash"|"card">("cash");
  const [paying,        setPaying]        = useState(false);
  const [payErr,        setPayErr]        = useState("");
  const [loading,       setLoading]       = useState(true);
  const [articleError,  setArticleError]  = useState<string | null>(null);

  // Auth
  useEffect(() => {
    const s = localStorage.getItem("shop_user");
    if (s) { try { setUser(JSON.parse(s)); } catch { /**/ } }
    setAuthChecked(true);
  }, []);

  const loadTables = useCallback(async () => {
    const [tRes, iRes] = await Promise.all([
      fetch(`/${slug}/api/tables`),
      fetch(`/${slug}/api/pos/invoices`),
    ]);
    if (tRes.ok) { const d = await tRes.json(); setTables(Array.isArray(d) ? d : (d.tables ?? [])); }
    if (iRes.ok) { const d = await iRes.json(); setOpenInvoices(d.invoices ?? []); }
  }, [slug]);

  const loadArticles = useCallback(async () => {
    try {
      const res = await fetch(`/${slug}/api/pos/articles`);
      const d = await res.json();
      if (!res.ok) {
        setArticleError(d.error ?? "Errore caricamento articoli");
        return;
      }
      setArticles(d.articles ?? []);
      setCategories(d.categories ?? []);
      if ((d.debug?.barpro_count ?? 0) === 0 && (d.debug?.menu_count ?? 0) === 0) {
        setArticleError(`Nessun articolo trovato. Debug: ${JSON.stringify(d.debug)}`);
      } else {
        setArticleError(null);
      }
    } catch (e) {
      setArticleError(`Errore fetch articoli: ${String(e)}`);
    }
  }, [slug]);

  useEffect(() => {
    if (!user) return;
    Promise.all([loadTables(), loadArticles()]).finally(() => setLoading(false));
  }, [user, loadTables, loadArticles]);

  // Derived
  const invMap = useMemo(() => {
    const m: Record<string, OpenInv> = {};
    for (const inv of openInvoices) if (inv.table_id) m[inv.table_id] = inv;
    return m;
  }, [openInvoices]);

  const filtered = useMemo(() => {
    return articles.filter(a => {
      const matchCat = selCat === "all" || a.category === selCat;
      const matchQ   = !search || a.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchQ;
    });
  }, [articles, selCat, search]);

  const totals = useMemo(() => calcTotals(cart), [cart]);

  // Cart actions
  function addArticle(a: Article) {
    if (search) setSearch(""); // clear search after adding
    setCart(prev => {
      const idx = prev.findIndex(c => c.article.id === a.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = { ...n[idx], qty: n[idx].qty + 1 }; return n; }
      return [...prev, { article: a, qty: 1 }];
    });
  }
  function changeQty(id: string, delta: number) {
    setCart(prev => prev.map(c => c.article.id === id ? { ...c, qty: c.qty + delta } : c).filter(c => c.qty > 0));
  }

  // Select table
  function selectTable(t: KioskTable) {
    setSelTable(t);
    setCart([]);
    setPayErr("");
    setSelCat("all");
    setSearch("");
  }

  // Pay
  async function handlePay() {
    if (!selTable || cart.length === 0) return;
    setPaying(true); setPayErr("");
    try {
      const res = await fetch(`/${slug}/api/pos/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_id:       selTable.id,
          employee_id:    user?.id,
          items:          cart.map(c => ({
            article_id:   c.article.id.startsWith("menu_") ? null : c.article.id,
            article_code: c.article.code,
            article_name: c.article.name,
            quantity:     c.qty,
            unit_price:   c.article.price,
            vat_rate:     c.article.vat_rate,
            total_price:  +(c.article.price * c.qty).toFixed(2),
          })),
          subtotal:       +totals.subtotal.toFixed(2),
          vat_amount:     +totals.vat_amount.toFixed(2),
          total:          +totals.total.toFixed(2),
          status:         "paid",
          payment_method: payMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setPayErr(data.error ?? "Errore"); return; }
      // Success: clear table
      setCart([]);
      setSelTable(null);
      await loadTables();
    } catch { setPayErr("Errore di connessione"); }
    finally { setPaying(false); }
  }

  if (!authChecked) return null;
  if (!user) return <LoginScreen onLogin={setUser} slug={slug} />;

  const H  = "56px";
  const TB = "90px"; // table bar height

  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column", background:"#0f172a", color:"#f1f5f9", fontFamily:"system-ui,sans-serif", overflow:"hidden" }}>

      {/* ── Header ── */}
      <header style={{ height:H, minHeight:H, background:"#1e293b", borderBottom:"1px solid #0f172a", display:"flex", alignItems:"center", padding:"0 16px", gap:12, flexShrink:0 }}>
        <span style={{ fontSize:20 }}>🍕</span>
        <span style={{ fontWeight:700, fontSize:15, flex:1 }}>
          La Piazzetta — Cassa POS
          {selTable && <span style={{ color:"#22c55e", marginLeft:12 }}>› {selTable.name}</span>}
        </span>
        <span style={{ color:"#64748b", fontSize:13 }}>{user.name}</span>
        {articles.length > 0 && <span style={{ color:"#4ade80", fontSize:11 }}>{articles.length} articoli</span>}
        <a href={`/${slug}/shop`} style={{ color:"#64748b", fontSize:12, textDecoration:"none", border:"1px solid #334155", borderRadius:6, padding:"4px 10px" }}>Dashboard</a>
        <button onClick={() => { localStorage.removeItem("shop_user"); setUser(null); }}
          style={{ background:"none", border:"1px solid #334155", color:"#94a3b8", borderRadius:6, padding:"4px 10px", cursor:"pointer", fontSize:12 }}>
          Esci
        </button>
      </header>

      {/* ── Body (categories | articles | invoice) ── */}
      <div style={{ flex:1, display:"flex", overflow:"hidden", minHeight:0 }}>

        {/* ── Categories ── */}
        <div style={{ width:160, background:"#1e293b", display:"flex", flexDirection:"column", borderRight:"1px solid #0f172a", overflow:"hidden" }}>
          <div style={{ background:"#166534", padding:"8px 12px", fontSize:12, fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:"#bbf7d0" }}>
            Categorie
          </div>
          <div style={{ flex:1, overflowY:"auto" }}>
            {[{ id:"all", label:"Tutti" }, ...categories.map(c => ({ id:c, label:catLabel(c) }))].map(cat => (
              <button key={cat.id} onClick={() => { setSelCat(cat.id); setSearch(""); }}
                style={{
                  display:"block", width:"100%", textAlign:"left",
                  padding:"10px 14px", background: selCat === cat.id ? "#166534" : "transparent",
                  color: selCat === cat.id ? "#fff" : "#94a3b8",
                  border:"none", borderBottom:"1px solid #0f172a",
                  cursor:"pointer", fontSize:13, fontWeight: selCat === cat.id ? 600 : 400,
                }}>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Articles ── */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <div style={{ background:"#166534", padding:"8px 12px", fontSize:12, fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:"#bbf7d0", display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ flex:1 }}>Prodotti</span>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setSelCat("all"); }}
              placeholder="🔍  Cerca..."
              style={{ background:"#14532d", border:"1px solid #15803d", borderRadius:6, padding:"4px 10px", color:"#f0fdf4", fontSize:12, width:160, outline:"none" }}
            />
          </div>

          {articleError && (
            <div style={{ margin:12, padding:12, background:"#450a0a", border:"1px solid #991b1b", borderRadius:8, color:"#fca5a5", fontSize:12 }}>
              ⚠ {articleError}
            </div>
          )}
          {loading ? (
            <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:"#64748b" }}>Caricamento…</div>
          ) : (
            <div style={{ flex:1, overflowY:"auto", padding:10, display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))", gap:8, alignContent:"start" }}>
              {filtered.map(a => (
                <button key={a.id} onClick={() => addArticle(a)}
                  style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:6, padding:"8px 6px", cursor:"pointer", textAlign:"center" }}
                  onMouseEnter={e => { e.currentTarget.style.background="#dbeafe"; e.currentTarget.style.borderColor="#93c5fd"; }}
                  onMouseLeave={e => { e.currentTarget.style.background="#f8fafc"; e.currentTarget.style.borderColor="#e2e8f0"; }}>
                  <div style={{ color:"#0f172a", fontSize:11, fontWeight:600, lineHeight:1.3, marginBottom:4 }}>{a.name}</div>
                  <div style={{ color:"#1d4ed8", fontSize:12, fontWeight:700 }}>{eur(a.price)}</div>
                </button>
              ))}
              {filtered.length === 0 && !loading && (
                <p style={{ color:"#64748b", gridColumn:"1/-1", textAlign:"center", marginTop:40, fontSize:13 }}>
                  {articles.length === 0 ? "Nessun articolo nel database" : "Nessun risultato"}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Invoice panel ── */}
        <div style={{ width:300, display:"flex", flexDirection:"column", background:"#1e293b", borderLeft:"1px solid #0f172a" }}>
          <div style={{ background:"#166534", padding:"8px 12px", fontSize:12, fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:"#bbf7d0" }}>
            {selTable ? `Conto — ${selTable.name}` : "Ordine"}
          </div>

          {/* Table header */}
          {!selTable && (
            <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:"#475569", fontSize:13, padding:20, textAlign:"center" }}>
              Seleziona un tavolo dalla barra in basso
            </div>
          )}

          {selTable && (
            <>
              {/* Cart items */}
              <div style={{ flex:1, overflowY:"auto", padding:8 }}>
                {cart.length === 0 && (
                  <p style={{ color:"#475569", textAlign:"center", marginTop:30, fontSize:12 }}>Aggiungi prodotti dal menu</p>
                )}
                {cart.map(c => (
                  <div key={c.article.id} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 4px", borderBottom:"1px solid #0f172a" }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color:"#f1f5f9", fontSize:12, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.article.name}</div>
                      <div style={{ color:"#64748b", fontSize:11 }}>{eur(c.article.price)} × {c.qty}</div>
                    </div>
                    <div style={{ color:"#f1f5f9", fontSize:13, fontWeight:700, minWidth:52, textAlign:"right" }}>{eur(c.article.price * c.qty)}</div>
                    <div style={{ display:"flex", gap:3 }}>
                      <button onClick={() => changeQty(c.article.id, -1)} style={{ background:"#0f172a", border:"1px solid #334155", color:"#f87171", borderRadius:4, width:22, height:22, cursor:"pointer", fontSize:14, lineHeight:1, padding:0 }}>−</button>
                      <button onClick={() => changeQty(c.article.id,  1)} style={{ background:"#0f172a", border:"1px solid #334155", color:"#4ade80", borderRadius:4, width:22, height:22, cursor:"pointer", fontSize:14, lineHeight:1, padding:0 }}>+</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              {cart.length > 0 && (
                <div style={{ padding:"10px 12px", borderTop:"1px solid #0f172a", background:"#0f172a" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", color:"#64748b", fontSize:12, marginBottom:3 }}>
                    <span>Imponibile</span><span>{eur(totals.subtotal)}</span>
                  </div>
                  {Object.entries(totals.vatByRate).map(([r, v]) => (
                    <div key={r} style={{ display:"flex", justifyContent:"space-between", color:"#64748b", fontSize:11, marginBottom:2 }}>
                      <span>IVA {r}%</span><span>{eur(v)}</span>
                    </div>
                  ))}
                  <div style={{ display:"flex", justifyContent:"space-between", color:"#f1f5f9", fontSize:18, fontWeight:700, borderTop:"1px solid #1e293b", paddingTop:6, marginTop:4 }}>
                    <span>TOTALE</span><span>{eur(totals.total)}</span>
                  </div>
                </div>
              )}

              {/* Payment method */}
              {cart.length > 0 && (
                <div style={{ display:"flex", gap:6, padding:"8px 12px", borderTop:"1px solid #0f172a" }}>
                  {(["cash","card"] as const).map(m => (
                    <button key={m} onClick={() => setPayMethod(m)} style={{ flex:1, padding:"7px 0", borderRadius:6, fontSize:12, fontWeight:600, cursor:"pointer", background: payMethod===m ? "#1d4ed8" : "#0f172a", color: payMethod===m ? "#fff" : "#64748b", border:`1px solid ${payMethod===m ? "#1d4ed8" : "#334155"}` }}>
                      {m === "cash" ? "💵 Contanti" : "💳 Carta"}
                    </button>
                  ))}
                </div>
              )}

              {payErr && <p style={{ color:"#f87171", fontSize:11, textAlign:"center", margin:"0 12px 6px" }}>{payErr}</p>}

              {/* Actions */}
              <div style={{ display:"flex", gap:8, padding:"10px 12px", borderTop:"1px solid #0f172a" }}>
                <button onClick={() => { setSelTable(null); setCart([]); }}
                  style={{ flex:1, background:"#0f172a", border:"1px solid #334155", color:"#94a3b8", borderRadius:8, padding:"10px 0", fontSize:13, cursor:"pointer" }}>
                  ← Chiudi
                </button>
                <button onClick={handlePay} disabled={paying || cart.length === 0}
                  style={{ flex:2, background: cart.length > 0 ? "#16a34a" : "#1e293b", border:"none", color: cart.length > 0 ? "#fff" : "#475569", borderRadius:8, padding:"10px 0", fontSize:14, fontWeight:700, cursor: cart.length > 0 ? "pointer" : "not-allowed" }}>
                  {paying ? "Salvo…" : `💰 Paga${cart.length > 0 ? "  " + eur(totals.total) : ""}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Table bar ── */}
      <div style={{ height:TB, minHeight:TB, background:"#1e293b", borderTop:"2px solid #166534", flexShrink:0, display:"flex", alignItems:"center", padding:"0 12px", gap:8, overflowX:"auto" }}>
        <span style={{ color:"#4ade80", fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase", whiteSpace:"nowrap", marginRight:4 }}>Tavoli</span>
        {tables.filter(t => t.active).map(t => {
          const inv      = invMap[t.id];
          const occupied = !!inv;
          const isActive = selTable?.id === t.id;
          // Try to show a number from the name, fallback to the name
          const label    = t.name.replace(/[^0-9]/g, "") || t.name;
          return (
            <button key={t.id} onClick={() => selectTable(t)}
              title={t.name + (occupied ? ` — ${eur(inv.total)}` : " — Libero")}
              style={{
                minWidth:52, height:64, borderRadius:8, border:`2px solid ${isActive ? "#fff" : occupied ? "#f59e0b" : "#334155"}`,
                background: isActive ? "#1d4ed8" : occupied ? "#92400e" : "#0f172a",
                color: "#fff", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2, flexShrink:0,
              }}>
              <span style={{ fontSize:18, fontWeight:700, lineHeight:1 }}>{label}</span>
              {occupied
                ? <span style={{ fontSize:9, color:"#fcd34d", fontWeight:600 }}>{eur(inv.total)}</span>
                : <span style={{ fontSize:9, color:"#475569" }}>libero</span>
              }
            </button>
          );
        })}
        {tables.filter(t => t.active).length === 0 && (
          <span style={{ color:"#475569", fontSize:12 }}>Nessun tavolo — aggiungili dal pannello Staff</span>
        )}
      </div>
    </div>
  );
}
