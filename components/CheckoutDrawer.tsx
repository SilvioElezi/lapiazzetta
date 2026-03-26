"use client";
import { useState } from "react";
import { useCart } from "./CartContext";

type Step = "cart" | "form" | "done";

export default function CheckoutDrawer() {
  const { cart, increase, decrease, remove, total } = useCart();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("cart");

  const [locating, setLocating] = useState(false);
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  const [placing, setPlacing] = useState(false);
  const [orderId, setOrderId] = useState("");

  const itemCount = cart.reduce((s: number, i: any) => s + i.qty, 0);

  const getGPS = () => {
    if (!navigator.geolocation) return;
    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          setAddress(
            data.display_name ??
              `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
          );
        } catch {
          setAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        }

        setLocating(false);
      },
      () => setLocating(false)
    );
  };

  // ✅ UPDATED ORDER FUNCTION WITH WHATSAPP
  const placeOrder = async () => {
    if (!clientName.trim() || !phone.trim() || !address.trim()) return;

    setPlacing(true);

    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          clientName: clientName.trim(),
          phone: phone.trim(),
          address: address.trim(),
          lat,
          lng,
          items: cart.map((i: any) => ({
            id: i.id,
            name: i.name,
            qty: i.qty,
            price: i.price
          })),
          total
        })
      });

      const data = await res.json();

      if (!res.ok) throw new Error("Order failed");

      // ✅ show success UI first
      setOrderId(data.id);
      setStep("done");

      // ✅ open WhatsApp after short delay (better UX)
      setTimeout(() => {
        if (data.whatsappLink) {
          window.open(data.whatsappLink, "_blank");
        }
      }, 500);

    } catch {
      alert("Errore. Riprova.");
    } finally {
      setPlacing(false);
    }
  };

  const resetAndClose = () => {
    setOpen(false);
    setStep("cart");
    setClientName("");
    setPhone("");
    setAddress("");
    setLat(null);
    setLng(null);
    setOrderId("");
  };

  return (
    <>
      <button
        className="fab"
        onClick={() => {
          setOpen(true);
          setStep("cart");
        }}
      >
        🛒 {itemCount}
      </button>

      {open && <div className="overlay" onClick={resetAndClose} />}

      <aside className={`drawer${open ? " drawer--open" : ""}`}>
        {step === "cart" && (
          <>
            <h2>Il tuo ordine</h2>

            {cart.length === 0 ? (
              <p>Carrello vuoto</p>
            ) : (
              <>
                {cart.map((item: any) => (
                  <div key={item.id}>
                    {item.name} x{item.qty} (€{item.price})
                    <button onClick={() => decrease(item.name)}>-</button>
                    <button onClick={() => increase(item.name)}>+</button>
                    <button onClick={() => remove(item.name)}>x</button>
                  </div>
                ))}

                <p>Totale: €{total.toFixed(2)}</p>

                <button onClick={() => setStep("form")}>
                  Procedi all'ordine
                </button>
              </>
            )}
          </>
        )}

        {step === "form" && (
          <>
            <h2>I tuoi dati</h2>

            <input
              placeholder="Nome"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />

            <input
              placeholder="Telefono"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <input
              placeholder="Indirizzo"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />

            <button onClick={getGPS}>
              {locating ? "..." : "Usa GPS"}
            </button>

            <button
              onClick={placeOrder}
              disabled={placing}
            >
              {placing ? "Invio..." : "🍕 Conferma ordine"}
            </button>
          </>
        )}

        {step === "done" && (
          <>
            <h2>Ordine ricevuto!</h2>
            <p>#{orderId}</p>
            <p>Controlla WhatsApp per confermare</p>
            <button onClick={resetAndClose}>Chiudi</button>
          </>
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
        .gps-btn{width:44px;height:44px;border-radius:10px;border:1.5px solid #EDE0CC;background:#fff;font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:border-color .15s;flex-shrink:0}
        .gps-btn:hover{border-color:#B03A2E}
        .gps-btn:disabled{opacity:.6;cursor:wait}
        .gps-confirm{font-size:.75rem;color:#2E7D32;margin-top:3px}
        .recap{background:#fff;border:1px solid #EDE0CC;border-radius:10px;padding:14px}
        .recap__label{font-size:.72rem;font-weight:500;text-transform:uppercase;letter-spacing:.08em;color:#7A7770;margin-bottom:8px}
        .recap__row{display:flex;justify-content:space-between;font-size:.85rem;color:#3A3A36;padding:3px 0}
        .recap__total{display:flex;justify-content:space-between;font-weight:600;font-size:.9rem;color:#1C1C1A;border-top:1px solid #EDE0CC;margin-top:8px;padding-top:8px}
        .btn-primary{width:100%;padding:14px;background:#B03A2E;color:#fff;border:none;border-radius:12px;font-size:.95rem;font-weight:500;cursor:pointer;transition:background .15s,transform .15s}
        .btn-primary:hover:not(:disabled){background:#C9503F;transform:translateY(-1px)}
        .btn-primary:disabled{opacity:.6;cursor:not-allowed}
        .done{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 24px;gap:12px;height:100%}
        .done__icon{font-size:3rem}
        .done__title{font-family:Georgia,serif;font-size:1.5rem;font-weight:700;color:#1C1C1A}
        .done__id{font-size:.78rem;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:#7A7770}
        .done__msg{font-size:.9rem;color:#3A3A36;line-height:1.5}
        .done__address{font-size:.88rem;font-weight:500;color:#B03A2E}
        `}
        </style>
    </>
  );
}
