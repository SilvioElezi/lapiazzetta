"use client";
import { useState, useEffect } from "react";
import type { Business } from "../../lib/types";

type FormState = Omit<Business, "id"> & { id?: string };

const EMPTY_FORM: FormState = {
  slug: "", name: "", phone: "", wa_phone: "",
  address: "", lat: undefined, lng: undefined,
  radius_km: 5, logo_url: "", subscription_expires_at: "",
};

export default function AdminPage() {
  const [authed,     setAuthed]     = useState(false);
  const [password,   setPassword]   = useState("");
  const [authError,  setAuthError]  = useState("");
  const [authLoading,setAuthLoading]= useState(false);

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [form,       setForm]       = useState<FormState>(EMPTY_FORM);
  const [editing,    setEditing]    = useState<string | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error,        setError]        = useState("");
  const [success,      setSuccess]      = useState("");
  const [locating,     setLocating]     = useState(false);
  const [locationLabel, setLocationLabel] = useState("");

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true); setLocationLabel("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setForm((f) => ({ ...f, lat, lng }));
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, { headers: { "Accept-Language": "it" } });
          const d = await res.json();
          setLocationLabel(d.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } catch { setLocationLabel(`${lat.toFixed(5)}, ${lng.toFixed(5)}`); }
        setLocating(false);
      },
      () => setLocating(false)
    );
  };

  const searchAddress = async (query: string) => {
    if (!query.trim()) return;
    setLocating(true); setLocationLabel("");
    try {
      const q = encodeURIComponent(query.trim());
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, { headers: { "Accept-Language": "it" } });
      const results = await res.json();
      if (results && results.length > 0) {
        const lat = parseFloat(results[0].lat);
        const lng = parseFloat(results[0].lon);
        setForm((f) => ({ ...f, lat, lng }));
        setLocationLabel(results[0].display_name);
      } else {
        setLocationLabel("Indirizzo non trovato");
      }
    } catch { setLocationLabel("Errore nella ricerca"); }
    setLocating(false);
  };

  const checkAuth = async () => {
    setAuthLoading(true); setAuthError("");
    try {
      const res = await fetch("/admin/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const d = await res.json();
        setAuthError(d.error ?? "Errore");
      } else {
        sessionStorage.setItem("admin_authed", "1");
        setAuthed(true);
      }
    } catch { setAuthError("Errore di connessione"); }
    finally { setAuthLoading(false); }
  };

  useEffect(() => {
    if (sessionStorage.getItem("admin_authed") === "1") setAuthed(true);
  }, []);

  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    fetch("/admin/api/businesses")
      .then((r) => r.json())
      .then((d) => { setBusinesses(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [authed]);

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/admin/api/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (d.url) setForm((f) => ({ ...f, logo_url: d.url }));
      else setError(d.error ?? "Upload fallito");
    } catch { setError("Upload fallito"); }
    finally { setUploadingLogo(false); }
  };

  const startEdit = (b: Business) => {
    setEditing(b.id);
    setForm({ ...b });
    setError(""); setSuccess(""); setLocationLabel("");
  };

  const startCreate = () => {
    setEditing("new");
    setForm(EMPTY_FORM);
    setError(""); setSuccess(""); setLocationLabel("");
  };

  const cancel = () => { setEditing(null); setForm(EMPTY_FORM); setError(""); setSuccess(""); setLocationLabel(""); };

  const save = async () => {
    if (!form.slug.trim() || !form.name.trim()) {
      setError("Slug e nome sono obbligatori"); return;
    }
    setSaving(true); setError(""); setSuccess("");
    try {
      let res: Response;
      if (editing === "new") {
        res = await fetch("/admin/api/businesses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        res = await fetch(`/admin/api/businesses/${editing}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Errore"); return; }

      if (editing === "new") {
        setBusinesses((prev) => [...prev, d]);
      } else {
        setBusinesses((prev) => prev.map((b) => b.id === editing ? d : b));
      }
      setSuccess(editing === "new" ? "Business creato!" : "Aggiornato!");
      setEditing(null); setForm(EMPTY_FORM);
    } catch { setError("Errore di connessione"); }
    finally { setSaving(false); }
  };

  // ── Auth gate ─────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={s.page}>
        <div style={s.loginCard}>
          <h1 style={s.loginTitle}>⚙️ Super Admin</h1>
          <p style={s.loginSub}>Accesso riservato</p>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && checkAuth()}
            style={s.input}
            autoFocus
          />
          <button onClick={checkAuth} disabled={authLoading} style={s.btnPrimary}>
            {authLoading ? "Verifica…" : "Accedi"}
          </button>
          {authError && <p style={s.errText}>{authError}</p>}
        </div>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────
  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.header}>
          <h1 style={s.title}>⚙️ Super Admin</h1>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={startCreate} style={s.btnPrimary}>+ Nuovo business</button>
            <button onClick={() => { sessionStorage.removeItem("admin_authed"); setAuthed(false); }} style={s.btnGhost}>Esci</button>
          </div>
        </div>

        {success && <div style={s.successBanner}>{success}</div>}
        {error   && <div style={s.errBanner}>{error}</div>}

        {/* ── Edit/Create form ── */}
        {editing !== null && (
          <div style={s.formCard}>
            <h2 style={s.formTitle}>{editing === "new" ? "Nuovo business" : "Modifica business"}</h2>

            <div style={s.grid2}>
              <Field label="Nome *" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
              <Field label="Slug * (es: lapiaggetta)" value={form.slug} onChange={(v) => setForm((f) => ({ ...f, slug: v.toLowerCase().replace(/\s+/g, "-") }))} disabled={editing !== "new"} />
              <Field label="Telefono" value={form.phone ?? ""} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
              <Field label="WhatsApp (es: 393308860293)" value={form.wa_phone ?? ""} onChange={(v) => setForm((f) => ({ ...f, wa_phone: v }))} />
              <Field label="Indirizzo" value={form.address ?? ""} onChange={(v) => setForm((f) => ({ ...f, address: v }))} style={{ gridColumn: "span 2" }} />
              <Field label="Raggio consegna (km)" value={form.radius_km.toString()} onChange={(v) => setForm((f) => ({ ...f, radius_km: parseFloat(v) || 5 }))} type="number" />
            </div>

            {/* ── Location picker ── */}
            <div style={{marginTop:16,display:"flex",flexDirection:"column",gap:8}}>
              <p style={s.fieldLabel}>Posizione del locale</p>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <div style={{display:"flex",flex:1,minWidth:200,border:"1.5px solid #EDE0CC",borderRadius:8,overflow:"hidden",background:"#fff"}}>
                  <input
                    type="text"
                    placeholder="Cerca indirizzo… (es: Via Roma 1, Bergamo)"
                    defaultValue={form.address ?? ""}
                    onKeyDown={(e) => e.key === "Enter" && searchAddress((e.target as HTMLInputElement).value)}
                    style={{flex:1,padding:"10px 12px",border:"none",outline:"none",fontSize:".88rem",fontFamily:"inherit",color:"#1C1C1A"}}
                  />
                  <button
                    type="button"
                    onClick={(e) => searchAddress(((e.currentTarget as HTMLButtonElement).previousElementSibling as HTMLInputElement).value)}
                    style={{padding:"0 14px",background:"#1C1C1A",color:"#FDF6EC",border:"none",cursor:"pointer",fontSize:".82rem",fontWeight:500,whiteSpace:"nowrap"}}
                  >
                    {locating ? "…" : "Cerca"}
                  </button>
                </div>
                <button type="button" onClick={useMyLocation} disabled={locating} style={s.gpsBtn}>
                  {locating ? "⏳" : "📍 GPS"}
                </button>
              </div>
              {locationLabel && (
                <p style={{fontSize:".75rem",color: locationLabel === "Indirizzo non trovato" ? "#B03A2E" : "#2E7D32",lineHeight:1.4}}>
                  {locationLabel === "Indirizzo non trovato" ? "⚠️ " : "✓ "}{locationLabel}
                </p>
              )}
              <div style={s.grid2}>
                <Field label="Latitudine" value={form.lat?.toString() ?? ""} onChange={(v) => { setForm((f) => ({ ...f, lat: v ? parseFloat(v) : undefined })); setLocationLabel(""); }} type="number" />
                <Field label="Longitudine" value={form.lng?.toString() ?? ""} onChange={(v) => { setForm((f) => ({ ...f, lng: v ? parseFloat(v) : undefined })); setLocationLabel(""); }} type="number" />
              </div>
              {form.lat != null && form.lng != null && (
                <a href={`https://maps.google.com/?q=${form.lat},${form.lng}`} target="_blank" rel="noopener noreferrer" style={{fontSize:".75rem",color:"#B03A2E",textDecoration:"none"}}>
                  🗺 Verifica su Google Maps
                </a>
              )}
            </div>

            <div style={{marginTop:16}}>
              <Field label="Scadenza abbonamento" value={form.subscription_expires_at ? form.subscription_expires_at.slice(0, 10) : ""} onChange={(v) => setForm((f) => ({ ...f, subscription_expires_at: v || "" }))} type="date" />
            </div>

            {/* Logo upload */}
            <div style={s.logoSection}>
              <p style={s.fieldLabel}>Logo</p>
              <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                {form.logo_url && (
                  <img src={form.logo_url} alt="logo" style={{width:56,height:56,objectFit:"contain",borderRadius:8,border:"1px solid #EDE0CC"}} />
                )}
                <label style={s.uploadBtn}>
                  {uploadingLogo ? "Caricamento…" : "📁 Carica immagine"}
                  <input type="file" accept="image/*" style={{display:"none"}}
                    onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])} />
                </label>
                {form.logo_url && (
                  <button onClick={() => setForm((f) => ({ ...f, logo_url: "" }))} style={s.btnGhost}>Rimuovi</button>
                )}
              </div>
              {form.logo_url && (
                <Field label="Logo URL" value={form.logo_url} onChange={(v) => setForm((f) => ({ ...f, logo_url: v }))} style={{ marginTop: 8 }} />
              )}
            </div>

            <div style={{display:"flex",gap:8,marginTop:16}}>
              <button onClick={save} disabled={saving} style={s.btnPrimary}>
                {saving ? "Salvataggio…" : "Salva"}
              </button>
              <button onClick={cancel} style={s.btnGhost}>Annulla</button>
            </div>
          </div>
        )}

        {/* ── Businesses list ── */}
        {loading ? (
          <p style={{color:"#7A7770",padding:24}}>Caricamento…</p>
        ) : (
          <div style={s.bizList}>
            {businesses.map((b) => (
              <div key={b.id} style={s.bizCard}>
                <div style={{display:"flex",alignItems:"center",gap:12,flex:1,minWidth:0}}>
                  {b.logo_url
                    ? <img src={b.logo_url} alt={b.name} style={{width:40,height:40,objectFit:"contain",borderRadius:6,border:"1px solid #EDE0CC",flexShrink:0}} />
                    : <div style={{width:40,height:40,background:"#F5EADA",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.2rem",flexShrink:0}}>🍕</div>
                  }
                  <div style={{minWidth:0}}>
                    <p style={s.bizName}>{b.name}</p>
                    <p style={s.bizSlug}>/{b.slug}</p>
                    {b.address && <p style={s.bizDetail}>{b.address}</p>}
                    <p style={s.bizDetail}>Raggio: {b.radius_km} km{b.phone ? ` · ${b.phone}` : ""}</p>
                    {b.subscription_expires_at && (() => {
                      const exp = new Date(b.subscription_expires_at);
                      const daysLeft = Math.ceil((exp.getTime() - Date.now()) / 86400000);
                      const color = daysLeft <= 0 ? "#B03A2E" : daysLeft <= 30 ? "#8A5E12" : "#2E7D32";
                      const label = daysLeft <= 0 ? "Abbonamento scaduto" : `Abbonamento: ${daysLeft}gg rimasti`;
                      return <p style={{ ...s.bizDetail, color, fontWeight: 600 }}>📅 {label} ({exp.toLocaleDateString("it-IT")})</p>;
                    })()}
                  </div>
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <a href={`/${b.slug}`} target="_blank" rel="noopener noreferrer" style={s.linkBtn}>🌐</a>
                  <a href={`/${b.slug}/shop`} target="_blank" rel="noopener noreferrer" style={s.linkBtn}>🍕</a>
                  <button onClick={() => startEdit(b)} style={s.editBtn}>✏️ Modifica</button>
                </div>
              </div>
            ))}
            {businesses.length === 0 && (
              <p style={{color:"#7A7770",textAlign:"center",padding:40}}>Nessun business ancora. Creane uno!</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", disabled = false, style: extraStyle,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; disabled?: boolean; style?: React.CSSProperties;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, ...extraStyle }}>
      <span style={s.fieldLabel}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{ ...s.input, ...(disabled ? { opacity: 0.5 } : {}) }}
      />
    </label>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:         { minHeight:"100vh", background:"#F5EADA", display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"40px 20px", fontFamily:"'DM Sans',sans-serif" },
  container:    { width:"100%", maxWidth:960 },
  header:       { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 },
  title:        { fontFamily:"Georgia,serif", fontSize:"1.5rem", fontWeight:700, color:"#1C1C1A" },
  loginCard:    { background:"#fff", borderRadius:20, padding:"40px 32px", width:"100%", maxWidth:360, display:"flex", flexDirection:"column", gap:14, boxShadow:"0 20px 60px rgba(0,0,0,.15)", alignItems:"center", margin:"0 auto" },
  loginTitle:   { fontFamily:"Georgia,serif", fontSize:"1.5rem", fontWeight:700, color:"#1C1C1A" },
  loginSub:     { fontSize:".82rem", color:"#7A7770" },
  formCard:     { background:"#fff", borderRadius:14, padding:"20px 24px", border:"1px solid #EDE0CC", marginBottom:24, boxShadow:"0 2px 12px rgba(28,28,26,.07)" },
  formTitle:    { fontFamily:"Georgia,serif", fontSize:"1.1rem", fontWeight:700, color:"#1C1C1A", marginBottom:16 },
  grid2:        { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px 16px" },
  fieldLabel:   { fontSize:".75rem", fontWeight:500, color:"#7A7770", textTransform:"uppercase", letterSpacing:".06em" },
  input:        { padding:"10px 12px", border:"1.5px solid #EDE0CC", borderRadius:8, fontSize:".9rem", fontFamily:"inherit", color:"#1C1C1A", width:"100%", boxSizing:"border-box" as const },
  btnPrimary:   { padding:"10px 20px", background:"#B03A2E", color:"#fff", border:"none", borderRadius:8, fontSize:".9rem", fontWeight:500, cursor:"pointer" },
  btnGhost:     { padding:"10px 20px", background:"transparent", color:"#7A7770", border:"1px solid #EDE0CC", borderRadius:8, fontSize:".9rem", cursor:"pointer" },
  uploadBtn:    { padding:"9px 14px", background:"#F5EADA", border:"1.5px solid #EDE0CC", borderRadius:8, fontSize:".85rem", cursor:"pointer", fontFamily:"inherit" },
  gpsBtn:       { padding:"9px 14px", background:"#F5EADA", border:"1.5px solid #EDE0CC", borderRadius:8, fontSize:".85rem", cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" as const, flexShrink:0 },
  logoSection:  { marginTop:16 },
  errText:      { fontSize:".8rem", color:"#B03A2E", textAlign:"center" },
  errBanner:    { background:"#FDECEA", border:"1px solid #F5B4AD", borderRadius:10, padding:"12px 16px", fontSize:".85rem", color:"#8C2318", marginBottom:16 },
  successBanner:{ background:"#EBF5EB", border:"1px solid #A5D6A7", borderRadius:10, padding:"12px 16px", fontSize:".85rem", color:"#1B5E20", marginBottom:16 },
  bizList:      { display:"flex", flexDirection:"column", gap:10 },
  bizCard:      { background:"#fff", border:"1px solid #EDE0CC", borderRadius:12, padding:"14px 16px", display:"flex", alignItems:"center", gap:12, boxShadow:"0 2px 8px rgba(28,28,26,.06)", flexWrap:"wrap" },
  bizName:      { fontWeight:600, fontSize:".95rem", color:"#1C1C1A" },
  bizSlug:      { fontSize:".78rem", color:"#B03A2E", fontWeight:500 },
  bizDetail:    { fontSize:".75rem", color:"#7A7770" },
  editBtn:      { padding:"7px 12px", background:"#fff", border:"1px solid #EDE0CC", borderRadius:7, fontSize:".78rem", cursor:"pointer" },
  linkBtn:      { padding:"7px 10px", background:"#F5EADA", border:"1px solid #EDE0CC", borderRadius:7, fontSize:".78rem", textDecoration:"none", color:"#1C1C1A" },
};
