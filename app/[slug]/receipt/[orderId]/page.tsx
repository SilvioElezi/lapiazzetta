"use client";
import { useEffect, useState } from "react";
import { use } from "react";

type OrderItem = { id: string; name: string; qty: number; price: number };
type OrderData = {
  id: string;
  client_name: string;
  phone: string;
  address: string;
  items: OrderItem[];
  total: number;
  status: string;
  placed_at: string;
  table_name?: string;
  order_type?: string;
};
type BusinessData = {
  name: string;
  slug: string;
  phone?: string;
  address?: string;
  logo_url?: string;
};

export default function ReceiptPage({
  params,
}: {
  params: Promise<{ slug: string; orderId: string }>;
}) {
  const { slug, orderId } = use(params);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/${slug}/api/order/${orderId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setOrder(d.order);
          setBusiness(d.business);
        }
      })
      .catch(() => setError("Errore di connessione"));
  }, [slug, orderId]);

  useEffect(() => {
    if (order && business) {
      // Small delay to ensure rendering is complete
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [order, business]);

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: "sans-serif" }}>
        <p style={{ color: "#B03A2E", fontSize: "1.1rem" }}>{error}</p>
      </div>
    );
  }

  if (!order || !business) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: "sans-serif" }}>
        <p style={{ color: "#7A7770" }}>Caricamento scontrino...</p>
      </div>
    );
  }

  const date = new Date(order.placed_at);
  const dateStr = date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const notes = order.items.find((it) => it.id === "_notes_");
  const lineItems = order.items.filter((it) => it.id !== "_notes_");

  return (
    <>
      <style>{receiptStyles}</style>
      <div className="receipt">
        {/* Header */}
        <div className="receipt__header">
          <h1 className="receipt__biz-name">{business.name}</h1>
          {business.address && (
            <p className="receipt__biz-detail">{business.address}</p>
          )}
          {business.phone && (
            <p className="receipt__biz-detail">Tel: {business.phone}</p>
          )}
        </div>

        <div className="receipt__divider" />

        {/* Order info */}
        <div className="receipt__info">
          <div className="receipt__info-row">
            <span>Ordine</span>
            <span className="receipt__order-id">#{order.id}</span>
          </div>
          <div className="receipt__info-row">
            <span>Data</span>
            <span>{dateStr} {timeStr}</span>
          </div>
          <div className="receipt__info-row">
            <span>Tipo</span>
            <span>{order.order_type === "kiosk" ? "Tavolo" : "Consegna"}</span>
          </div>
        </div>

        <div className="receipt__divider" />

        {/* Customer */}
        <div className="receipt__customer">
          <p className="receipt__customer-name">{order.client_name}</p>
          {order.order_type === "kiosk" && order.table_name && (
            <p className="receipt__customer-detail">Tavolo: {order.table_name}</p>
          )}
          {order.order_type !== "kiosk" && order.address && (
            <p className="receipt__customer-detail">{order.address}</p>
          )}
          {order.order_type !== "kiosk" && order.phone && (
            <p className="receipt__customer-detail">Tel: {order.phone}</p>
          )}
        </div>

        <div className="receipt__divider-double" />

        {/* Items */}
        <table className="receipt__items">
          <thead>
            <tr>
              <th className="receipt__th-qty">Qt</th>
              <th className="receipt__th-name">Articolo</th>
              <th className="receipt__th-price">Prezzo</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item) => (
              <tr key={item.id}>
                <td className="receipt__td-qty">{item.qty}</td>
                <td className="receipt__td-name">{item.name}</td>
                <td className="receipt__td-price">
                  {(item.price * item.qty).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {notes && (
          <div className="receipt__notes">
            Note: {notes.name}
          </div>
        )}

        <div className="receipt__divider-double" />

        {/* Total */}
        <div className="receipt__total">
          <span>TOTALE</span>
          <span className="receipt__total-amt">
            &euro;{order.total.toFixed(2)}
          </span>
        </div>

        <div className="receipt__divider" />

        {/* Footer */}
        <div className="receipt__footer">
          <p>Grazie per il tuo ordine!</p>
          <p className="receipt__footer-sub">{business.name}</p>
        </div>

        {/* Print button (hidden when printing) */}
        <div className="receipt__actions no-print">
          <button className="receipt__print-btn" onClick={() => window.print()}>
            Stampa
          </button>
          <button
            className="receipt__close-btn"
            onClick={() => window.close()}
          >
            Chiudi
          </button>
        </div>
      </div>
    </>
  );
}

const receiptStyles = `
  @page {
    size: 80mm auto;
    margin: 0;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: #f5f5f5;
    font-family: 'Courier New', Courier, monospace;
    font-size: 13px;
    color: #000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .receipt {
    width: 80mm;
    margin: 20px auto;
    background: #fff;
    padding: 12px 10px;
    box-shadow: 0 2px 20px rgba(0,0,0,.1);
  }

  @media print {
    body { background: #fff; }
    .receipt {
      width: 100%;
      margin: 0;
      padding: 4mm 3mm;
      box-shadow: none;
    }
    .no-print { display: none !important; }
  }

  .receipt__header {
    text-align: center;
    padding-bottom: 8px;
  }

  .receipt__biz-name {
    font-family: 'Courier New', monospace;
    font-size: 18px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  .receipt__biz-detail {
    font-size: 11px;
    color: #444;
    margin-top: 2px;
  }

  .receipt__divider {
    border-top: 1px dashed #999;
    margin: 8px 0;
  }

  .receipt__divider-double {
    border-top: 2px solid #000;
    margin: 8px 0;
  }

  .receipt__info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .receipt__info-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
  }

  .receipt__order-id {
    font-weight: 700;
  }

  .receipt__customer {
    padding: 4px 0;
  }

  .receipt__customer-name {
    font-weight: 700;
    font-size: 13px;
  }

  .receipt__customer-detail {
    font-size: 11px;
    color: #444;
    margin-top: 1px;
  }

  .receipt__items {
    width: 100%;
    border-collapse: collapse;
  }

  .receipt__items th {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    border-bottom: 1px solid #000;
    padding: 4px 0;
  }

  .receipt__th-qty { text-align: left; width: 24px; }
  .receipt__th-name { text-align: left; }
  .receipt__th-price { text-align: right; }

  .receipt__items td {
    padding: 3px 0;
    vertical-align: top;
    font-size: 12px;
  }

  .receipt__td-qty { text-align: left; font-weight: 700; }
  .receipt__td-name { text-align: left; word-break: break-word; }
  .receipt__td-price { text-align: right; white-space: nowrap; }

  .receipt__notes {
    font-size: 11px;
    font-style: italic;
    margin-top: 6px;
    padding: 4px 0;
    color: #333;
  }

  .receipt__total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 16px;
    font-weight: 700;
    padding: 4px 0;
  }

  .receipt__total-amt {
    font-size: 20px;
  }

  .receipt__footer {
    text-align: center;
    padding: 8px 0 4px;
    font-size: 12px;
  }

  .receipt__footer-sub {
    font-size: 10px;
    color: #888;
    margin-top: 2px;
  }

  .receipt__actions {
    display: flex;
    gap: 8px;
    margin-top: 16px;
    justify-content: center;
  }

  .receipt__print-btn {
    padding: 10px 24px;
    background: #1C1C1A;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
  }

  .receipt__print-btn:hover { opacity: .85; }

  .receipt__close-btn {
    padding: 10px 24px;
    background: transparent;
    color: #7A7770;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
  }

  .receipt__close-btn:hover { background: #f5f5f5; }
`;
