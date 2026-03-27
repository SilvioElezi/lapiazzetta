"use client";
import { useState, useEffect } from "react";
import { useCart } from "./CartContext";
import { haversineKm } from "../lib/haversine";
import type { Business, WeekHours, DayHours } from "../lib/types";

type Step = "cart" | "form" | "confirm" | "done";

const DAY_KEYS_SUN = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
const DAY_LABELS_SHORT: Record<string, string> = {
  monday:"Lun", tuesday:"Mar", wednesday:"Mer",
  thursday:"Gio", friday:"Ven", saturday:"Sab", sunday:"Dom",
};

function fmtShift(d: DayHours) {
  const s1 = `${d.from}–${d.to}`;
  return d.from2 && d.to2 ? `${s1} · ${d.from2}–${d.to2}` : s1;
}

function isInShift(now: string, from: string, to: string) {
  return now >= from && now <= to;
}

function isOpenNow(hours: WeekHours | null): boolean {
  if (!hours) return true;
  const today = hours[DAY_KEYS_SUN[new Date().getDay()] as keyof WeekHours];
  if (!today?.open) return false;
  const now = new Date();
  const t = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  if (isInShift(t, today.from, today.to)) return true;
  if (today.from2 && today.to2 && isInShift(t, today.from2, today.to2)) return true;
  return false;
}

function hoursMessage(hours: WeekHours | null): string {
  if (!hours) return "";
  const todayIdx = new Date().getDay();
  const todayKey = DAY_KEYS_SUN[todayIdx];
  const today = hours[todayKey as keyof WeekHours];

  if (today?.open) {
    return `Oggi: ${fmtShift(today)}`;
  }
  // Find next open day (wrap around the week)
  for (let i = 1; i <= 7; i++) {
    const key = DAY_KEYS_SUN[(todayIdx + i) % 7];
    const day = hours[key as keyof WeekHours];
    if (day?.open) {
      return `Oggi siamo chiusi. Prossima apertura: ${DAY_LABELS_SHORT[key]} ${fmtShift(day)}`;
    }
  }
  return "Siamo temporaneamente chiusi.";
}

export default function CheckoutDrawer({ business }: { business?: Business }) {
  const slug = business?.slug;
  const { cart, increase, decrease, remove, total } = useCart();
  const [open,         setOpen]        = useState(false);
  const [step,         setStep]        = useState<Step>("cart");
  const [locating,     setLocating]    = useState(false);
  const [onlineOrders, setOnlineOrders] = useState(true);
  const [deliveryFee,  setDeliveryFee] = useState(0);
  const [hours,        setHours]       = useState<WeekHours | null>(null);

  // Form fields
  const [clientName, setClientName] = useState("");
  const [phone,      setPhone]      = useState("");
  const [street,     setStreet]     = useState("");
  const [civic,      setCivic]      = useState("");
  const [cap,        setCap]        = useState("");
  const [lat,        setLat]        = useState<number | null>(null);
  const [lng,        setLng]        = useState<number | null>(null);

  // Order result
  const [placing,    setPlacing]    = useState(false);
  const [orderId,    setOrderId]    = useState("");

  // OTP confirmation
  const [otp,          setOtp]          = useState("");
  const [confirming,   setConfirming]   = useState(false);
  const [otpError,     setOtpError]     = useState("");

  // Address / radius error
  const [addressError, setAddressError] = useState("");
  const [geocoding,    setGeocoding]    = useState(false);

  const itemCount = cart.reduce((s: number, i: any) => s + i.qty, 0);
  const openNow   = isOpenNow(hours);
  const canOrder  = onlineOrders && openNow;

  useEffect(() => {
    const url = slug ? `/${slug}/api/settings` : "/api/settings";
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        setOnlineOrders(d.online_orders ?? true);
        setDeliveryFee(d.delivery_fee ? parseFloat(d.delivery_fee) || 0 : 0);
        if (d.hours) setHours(d.hours);
      })
      .catch(() => {});
  }, [slug]);

  const getGPS = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude); setLng(longitude);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const d = await res.json();
          setStreet(d.address?.road ?? "");
          setCivic(d.address?.house_number ?? "");
          setCap(d.address?.postcode ?? "");
        } catch {}
        setLocating(false);
      },
      () => setLocating(false)
    );
  };

  const address = [street.trim(), civic.trim(), cap.trim()].filter(Boolean).join(", ");

  const placeOrder = async () => {
    if (!clientName.trim() || !phone.trim() || !street.trim() || !civic.trim()) return;
    setAddressError("");

    let orderLat = lat;
    let orderLng = lng;

    // If no GPS coords, geocode the typed address with Nominatim (free, no key)
    if (orderLat == null || orderLng == null) {
      setGeocoding(true);
      try {
        const q = encodeURIComponent(`${address}, Italia`);
        const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=it`;
        const res = await fetch(url, { headers: { "Accept-Language": "it" } });
        const results = await res.json();
        if (!results || results.length === 0) {
          setAddressError("Indirizzo non trovato. Prova a essere più preciso o usa il GPS 📍");
          setGeocoding(false);
          return;
        }
        orderLat = parseFloat(results[0].lat);
        orderLng = parseFloat(results[0].lon);
        setLat(orderLat);
        setLng(orderLng);
      } catch {
        setAddressError("Impossibile verificare l'indirizzo. Usa il pulsante GPS 📍");
        setGeocoding(false);
        return;
      }
      setGeocoding(false);
    }

    // Client-side radius check (server will also verify, but this gives instant feedback)
    if (
      orderLat != null && orderLng != null &&
      business?.lat != null && business?.lng != null && business?.radius_km != null
    ) {
      const dist = haversineKm(business.lat, business.lng, orderLat, orderLng);
      if (dist > business.radius_km) {
        const distFmt = dist.toLocaleString("it-IT", { maximumFractionDigits: 1 });
        setAddressError(
          `Ci dispiace, ma il tuo indirizzo si trova a ${distFmt} km da noi e la nostra zona di consegna arriva fino a ${business.radius_km} km. Speriamo di poterti servire presto!`
        );
        return;
      }
    }

    setPlacing(true);
    try {
      const orderUrl = slug ? `/${slug}/api/order` : "/api/order";
      const res = await fetch(orderUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: clientName.trim(),
          phone:      phone.trim(),
          address:    address.trim(),
          lat: orderLat,
          lng: orderLng,
          items: cart.map((i: any) => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
          total,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrderId(data.id);
      setOtp("");
      setOtpError("");
      setStep("confirm");
    } catch (err: any) { setAddressError(err.message ?? "Errore nell'invio. Riprova."); }
    finally { setPlacing(false); }
  };

  const confirmOtp = async () => {
    if (otp.length !== 4) { setOtpError("Inserisci il codice a 4 cifre"); return; }
    setConfirming(true); setOtpError("");
    try {
      const confirmUrl = slug ? `/${slug}/api/confirm` : "/api/confirm";
      const res = await fetch(confirmUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, otp }),
      });
      const data = await res.json();
      if (!res.ok) { setOtpError(data.error ?? "Codice non corretto"); return; }
      setStep("done");
    } catch { setOtpError("Errore di connessione. Riprova."); }
    finally { setConfirming(false); }
  };

  const resetAndClose = () => {
    setOpen(false); setStep("cart");
    setClientName(""); setPhone(""); setStreet(""); setCivic(""); setCap("");
    setLat(null); setLng(null);
    setOrderId(""); setOtp(""); setOtpError(""); setAddressError("");
  };

  return (
    <>
      {/* FAB */}
      <button className="fab" onClick={() => { setOpen(true); setStep("cart"); }} aria-label="Apri carrello">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
        </svg>
        {itemCount > 0 && <span className="fab__badge">{itemCount}</span>}
      </button>

      {open && <div className="overlay" onClick={step === "confirm" ? undefined : resetAndClose} />}

      <aside className={`drawer${open ? " drawer--open" : ""}`}>

        {/* ── CART ── */}
        {step === "cart" && <>
          <div className="drawer__head">
            <h2 className="drawer__title">Il tuo ordine</h2>
            <button className="drawer__close" onClick={resetAndClose}>✕</button>
          </div>
          <div className="drawer__body">
            {cart.length === 0
              ? <div className="empty"><span>🛒</span><p>Carrello vuoto</p><small>Aggiungi qualcosa dal menu!</small></div>
              : <ul className="items">{cart.map((item: any) => (
                  <li key={item.id} className="item">
                    <div className="item__row">
                      <span className="item__name">{item.name}</span>
                      <span className="item__price">€{(item.price * item.qty).toFixed(2)}</span>
                    </div>
                    <div className="item__controls">
                      <button onClick={() => decrease(item.name)}>−</button>
                      <span>{item.qty}</span>
                      <button onClick={() => increase(item.name)}>+</button>
                      <button className="item__del" onClick={() => remove(item.name)}>🗑</button>
                    </div>
                  </li>
                ))}</ul>
            }
          </div>
          {cart.length > 0 && (
            <div className="drawer__foot">
              {deliveryFee > 0 && (
                <div className="total-row"><span>Articoli</span><span>€{total.toFixed(2)}</span></div>
              )}
              {deliveryFee > 0 && (
                <div className="total-row"><span>Consegna</span><span>€{deliveryFee.toFixed(2)}</span></div>
              )}
              <div className="total-row"><span>Totale</span><span className="total-amt">€{(total + deliveryFee).toFixed(2)}</span></div>
              {!onlineOrders
                ? <div className="orders-closed">🔴 Siamo operativi ma gli ordini online sono temporaneamente sospesi. Torniamo presto!</div>
                : !openNow
                  ? <div className="orders-closed">🕐 Al momento siamo chiusi. {hoursMessage(hours)}</div>
                  : <button className="btn-primary" onClick={() => setStep("form")}>Procedi all&apos;ordine →</button>
              }
            </div>
          )}
        </>}

        {/* ── FORM ── */}
        {step === "form" && <>
          <div className="drawer__head">
            <button className="drawer__back" onClick={() => setStep("cart")}>← Indietro</button>
            <h2 className="drawer__title">I tuoi dati</h2>
            <button className="drawer__close" onClick={resetAndClose}>✕</button>
          </div>
          <div className="drawer__body">
            <div className="form">
              <label className="field"><span>Nome e cognome *</span>
                <input type="text" placeholder="Mario Rossi" value={clientName}
                  onChange={(e) => setClientName(e.target.value)} autoComplete="name" />
              </label>
              <label className="field"><span>Telefono *</span>
                <input type="tel" placeholder="+39 333 123 4567" value={phone}
                  onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
              </label>
              <div className="field"><span>Indirizzo di consegna *</span>
                <button type="button" className={`gps-banner${lat ? " gps-banner--done" : ""}`} onClick={getGPS} disabled={locating}>
                  <span className="gps-banner__icon">{locating ? "⏳" : lat ? "✅" : "📍"}</span>
                  <span className="gps-banner__text">
                    <strong>{locating ? "Rilevamento in corso…" : lat ? "Posizione rilevata automaticamente" : "Usa la mia posizione attuale"}</strong>
                    {!lat && !locating && <span>Compila l&apos;indirizzo in un click</span>}
                  </span>
                </button>
                <div className="addr-divider"><span>oppure scrivi manualmente</span></div>
                <div className="addr-row">
                  <input type="text" placeholder="Via / Piazza / Corso…" value={street}
                    onChange={(e) => { setStreet(e.target.value); setLat(null); setLng(null); setAddressError(""); }}
                    autoComplete="address-line1" />
                </div>
                <div className="addr-row" style={{marginTop:6}}>
                  <input type="text" placeholder="N° civico" value={civic}
                    onChange={(e) => { setCivic(e.target.value); setLat(null); setLng(null); setAddressError(""); }}
                    autoComplete="address-line2" style={{flex:1}} />
                  <input type="text" placeholder="CAP" value={cap}
                    onChange={(e) => { setCap(e.target.value); setLat(null); setLng(null); setAddressError(""); }}
                    autoComplete="postal-code" inputMode="numeric" style={{flex:1}} />
                </div>
              </div>
              <div className="sms-notice">
                <span className="sms-notice__icon">💬</span>
                <span>Riceverai un <strong>codice SMS</strong> sul numero indicato per confermare l&apos;ordine.</span>
              </div>
              <div className="recap">
                <p className="recap__label">Riepilogo</p>
                {cart.map((i: any) => (
                  <div key={i.id} className="recap__row"><span>{i.name} x{i.qty}</span><span>€{(i.price * i.qty).toFixed(2)}</span></div>
                ))}
                {deliveryFee > 0 && (
                  <div className="recap__row"><span>Consegna</span><span>€{deliveryFee.toFixed(2)}</span></div>
                )}
                <div className="recap__total"><span>Totale</span><span>€{(total + deliveryFee).toFixed(2)}</span></div>
              </div>
            </div>
          </div>
          <div className="drawer__foot">
            {addressError && <div className="addr-error">🚫 {addressError}</div>}
            {!onlineOrders
              ? <div className="orders-closed">🔴 Siamo operativi ma gli ordini online sono temporaneamente sospesi. Torniamo presto!</div>
              : !openNow
                ? <div className="orders-closed">🕐 Al momento siamo chiusi. {hoursMessage(hours)}</div>
                : <button className="btn-primary" onClick={placeOrder}
                    disabled={placing || geocoding || !clientName || !phone || !street || !civic}>
                    {geocoding ? "Verifica indirizzo…" : placing ? "Invio in corso…" : "Continua →"}
                  </button>
            }
          </div>
        </>}

        {/* ── CONFIRM (OTP) ── */}
        {step === "confirm" && <>
          <div className="drawer__head">
            <h2 className="drawer__title">Conferma ordine</h2>
          </div>
          <div className="drawer__body">
            <div className="confirm-screen">
              <div className="confirm-screen__icon">💬</div>
              <h3 className="confirm-screen__title">Codice di conferma</h3>
              <p className="confirm-screen__text">
                Abbiamo inviato un SMS con un codice a 4 cifre al numero <strong>{phone}</strong>. Inseriscilo qui sotto per confermare l&apos;ordine.
              </p>

              <div className="otp-field">
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  placeholder="0000"
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 4)); setOtpError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && confirmOtp()}
                  autoFocus
                  className="otp-input"
                />
              </div>

              {otpError && <p className="otp-error">{otpError}</p>}

              <button
                className="btn-primary"
                onClick={confirmOtp}
                disabled={confirming || otp.length !== 4}
                style={{ width: "100%" }}
              >
                {confirming ? "Verifica…" : "Conferma ordine"}
              </button>

              <p className="confirm-expire">
                ⏱ L&apos;ordine scade in 15 minuti se non confermato.
              </p>
            </div>
          </div>
        </>}

        {/* ── DONE ── */}
        {step === "done" && (
          <div className="done">
            <div className="done__icon">✅</div>
            <h2 className="done__title">Ordine confermato!</h2>
            <p className="done__id">#{orderId}</p>
            <p className="done__msg">Ciao <strong>{clientName}</strong>! Il tuo ordine è in preparazione.</p>
            <p className="done__address">{address}</p>
            <button className="btn-primary" onClick={resetAndClose}>Chiudi</button>
          </div>
        )}
      </aside>

      <style>{`
        .fab{position:fixed;bottom:28px;right:28px;z-index:100;width:58px;height:58px;border-radius:50%;background:#B03A2E;color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(176,58,46,.45);transition:transform .2s,box-shadow .2s}
        .fab:hover{transform:translateY(-3px);box-shadow:0 8px 28px rgba(176,58,46,.55)}
        .fab__badge{position:absolute;top:-4px;right:-4px;background:#C9923A;color:#fff;font-size:.68rem;font-weight:700;min-width:20px;height:20px;border-radius:10px;display:flex;align-items:center;justify-content:center;padding:0 5px;border:2px solid #fff}
        .overlay{position:fixed;inset:0;z-index:101;background:rgba(28,28,26,.5);backdrop-filter:blur(2px);animation:fadeIn .2s ease}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .drawer{position:fixed;top:0;right:0;bottom:0;z-index:102;width:100%;max-width:420px;background:#FDF6EC;display:flex;flex-direction:column;transform:translateX(100%);transition:transform .3s cubic-bezier(.22,1,.36,1);box-shadow:-8px 0 40px rgba(28,28,26,.15)}
        .drawer--open{transform:translateX(0)}
        .drawer__head{display:flex;align-items:center;gap:10px;padding:18px 20px;background:#1C1C1A;border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0}
        .drawer__title{flex:1;font-family:Georgia,serif;font-size:1.15rem;font-weight:700;color:#FDF6EC}
        .drawer__close,.drawer__back{background:rgba(253,246,236,.1);border:none;color:#FDF6EC;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:.82rem;transition:background .15s;white-space:nowrap}
        .drawer__close:hover,.drawer__back:hover{background:rgba(253,246,236,.2)}
        .drawer__body{flex:1;overflow-y:auto;padding:16px 20px}
        .drawer__foot{padding:16px 20px;border-top:1px solid #EDE0CC;background:#fff;flex-shrink:0;display:flex;flex-direction:column;gap:12px}
        .empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;height:220px;color:#7A7770;text-align:center}
        .empty span{font-size:2.5rem}
        .empty p{font-weight:500;color:#1C1C1A}
        .items{list-style:none;display:flex;flex-direction:column;gap:6px}
        .item{padding:12px;background:#fff;border:1px solid #EDE0CC;border-radius:10px;display:flex;flex-direction:column;gap:8px}
        .item__row{display:flex;justify-content:space-between;gap:8px}
        .item__name{font-size:.9rem;font-weight:500;color:#1C1C1A}
        .item__price{font-size:.9rem;font-weight:500;color:#B03A2E;white-space:nowrap}
        .item__controls{display:flex;align-items:center;gap:8px}
        .item__controls button{width:28px;height:28px;border-radius:50%;border:1px solid #EDE0CC;background:#FDF6EC;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;transition:background .15s}
        .item__controls button:hover{background:#EDE0CC}
        .item__controls span{font-size:.95rem;font-weight:500;min-width:20px;text-align:center}
        .item__del{margin-left:auto;font-size:.78rem!important}
        .total-row{display:flex;justify-content:space-between;align-items:center}
        .total-row span{font-size:.82rem;font-weight:500;text-transform:uppercase;letter-spacing:.06em;color:#7A7770}
        .total-amt{font-family:Georgia,serif;font-size:1.5rem;font-weight:700;color:#1C1C1A}
        .form{display:flex;flex-direction:column;gap:16px}
        .field{display:flex;flex-direction:column;gap:5px}
        .field>span{font-size:.78rem;font-weight:500;color:#7A7770;text-transform:uppercase;letter-spacing:.06em}
        .field input{padding:11px 14px;border:1.5px solid #EDE0CC;border-radius:10px;background:#fff;font-size:.92rem;color:#1C1C1A;transition:border-color .15s;width:100%}
        .field input:focus{outline:none;border-color:#B03A2E}
        .addr-row{display:flex;gap:8px}
        .addr-row input{flex:1}
        .gps-banner{width:100%;display:flex;align-items:center;gap:12px;padding:12px 14px;background:#EBF5EB;border:1.5px solid #A5D6A7;border-radius:10px;cursor:pointer;text-align:left;font-family:inherit;transition:background .15s,border-color .15s;margin-bottom:2px}
        .gps-banner:hover:not(:disabled){background:#DCEDC8;border-color:#81C784}
        .gps-banner:disabled{cursor:wait;opacity:.7}
        .gps-banner--done{background:#F1F8E9;border-color:#81C784}
        .gps-banner__icon{font-size:1.4rem;flex-shrink:0}
        .gps-banner__text{display:flex;flex-direction:column;gap:1px}
        .gps-banner__text strong{font-size:.88rem;font-weight:600;color:#1B5E20}
        .gps-banner__text span{font-size:.75rem;color:#388E3C}
        .addr-divider{display:flex;align-items:center;gap:8px;margin:10px 0 8px;color:#B0ACA5;font-size:.72rem}
        .addr-divider::before,.addr-divider::after{content:"";flex:1;height:1px;background:#EDE0CC}
        .sms-notice{display:flex;align-items:flex-start;gap:8px;padding:10px 12px;background:#EBF0FB;border-radius:8px;border-left:3px solid #3B5BDB;font-size:.8rem;color:#1E3A8A;line-height:1.5}
        .sms-notice__icon{flex-shrink:0;margin-top:1px}
        .recap{background:#fff;border:1px solid #EDE0CC;border-radius:10px;padding:14px}
        .recap__label{font-size:.72rem;font-weight:500;text-transform:uppercase;letter-spacing:.08em;color:#7A7770;margin-bottom:8px}
        .recap__row{display:flex;justify-content:space-between;font-size:.85rem;color:#3A3A36;padding:3px 0}
        .recap__total{display:flex;justify-content:space-between;font-weight:600;font-size:.9rem;color:#1C1C1A;border-top:1px solid #EDE0CC;margin-top:8px;padding-top:8px}
        .addr-error{background:#FDECEA;border:1px solid #F5B4AD;border-radius:10px;padding:12px 14px;font-size:.83rem;color:#8C2318;line-height:1.5}
        .orders-closed{background:#FDECEA;border:1px solid #F5B4AD;border-radius:10px;padding:14px;font-size:.85rem;color:#8C2318;text-align:center;line-height:1.6}
        .btn-primary{width:100%;padding:14px;background:#B03A2E;color:#fff;border:none;border-radius:12px;font-family:inherit;font-size:.95rem;font-weight:500;cursor:pointer;transition:background .15s,transform .15s}
        .btn-primary:hover:not(:disabled){background:#C9503F;transform:translateY(-1px)}
        .btn-primary:disabled{opacity:.6;cursor:not-allowed}

        /* Confirm / OTP screen */
        .confirm-screen{display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center;padding:8px 0}
        .confirm-screen__icon{font-size:3rem}
        .confirm-screen__title{font-family:Georgia,serif;font-size:1.2rem;font-weight:700;color:#1C1C1A}
        .confirm-screen__text{font-size:.88rem;color:#7A7770;line-height:1.6;max-width:320px}
        .confirm-screen__text strong{color:#1C1C1A}
        .otp-field{width:100%;display:flex;justify-content:center}
        .otp-input{width:160px;padding:18px 12px;border:2px solid #EDE0CC;border-radius:14px;background:#fff;font-size:2rem;font-weight:700;letter-spacing:.5rem;text-align:center;color:#1C1C1A;transition:border-color .15s;font-family:monospace}
        .otp-input:focus{outline:none;border-color:#B03A2E}
        .otp-error{font-size:.82rem;color:#B03A2E;text-align:center}
        .confirm-expire{font-size:.75rem;color:#B0ACA5;text-align:center}

        /* Done screen */
        .done{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 24px;gap:12px;height:100%}
        .done__icon{font-size:3rem}
        .done__title{font-family:Georgia,serif;font-size:1.5rem;font-weight:700;color:#1C1C1A}
        .done__id{font-size:.78rem;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:#7A7770}
        .done__msg{font-size:.9rem;color:#3A3A36;line-height:1.5}
        .done__address{font-size:.88rem;font-weight:500;color:#B03A2E;margin-bottom:8px}
      `}</style>
    </>
  );
}
