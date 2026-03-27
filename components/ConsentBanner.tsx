"use client";
import { useState, useEffect } from "react";

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("gdpr_consent")) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem("gdpr_consent", "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      <div className="consent-overlay" />
      <div className="consent" role="dialog" aria-modal="true" aria-label="Informativa privacy">
        <div className="consent__inner">
          <div className="consent__text">
            <p className="consent__title">🍕 Prima di ordinare</p>
            <p className="consent__body">
              Per elaborare il tuo ordine raccogliamo <strong>nome, numero di telefono e indirizzo di consegna</strong>.
              Questi dati vengono utilizzati <strong>esclusivamente</strong> per la gestione dell&apos;ordine e non sono
              condivisi con terze parti né usati per finalità commerciali, nel rispetto del{" "}
              <strong>Regolamento UE 2016/679 (GDPR)</strong>.
            </p>
          </div>
          <div className="consent__actions">
            <a href="#privacy" onClick={accept} className="consent__link">Privacy Policy</a>
            <button className="consent__btn" onClick={accept}>Accetto e continuo</button>
          </div>
        </div>
      </div>

      <style>{`
        .consent-overlay{position:fixed;inset:0;z-index:299;background:rgba(28,28,26,.45);backdrop-filter:blur(2px);animation:fadeIn .2s ease}
        .consent{position:fixed;bottom:0;left:0;right:0;z-index:300;background:#FDF6EC;border-top:2px solid #EDE0CC;box-shadow:0 -8px 40px rgba(28,28,26,.18);animation:slideUp .25s cubic-bezier(.22,1,.36,1);padding:20px 24px 28px}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .consent__inner{max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:16px}
        .consent__title{font-family:Georgia,serif;font-size:1rem;font-weight:700;color:#1C1C1A;margin-bottom:6px}
        .consent__body{font-size:.82rem;color:#3A3A36;line-height:1.6}
        .consent__body strong{color:#1C1C1A}
        .consent__actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
        .consent__btn{padding:12px 28px;background:#B03A2E;color:#fff;border:none;border-radius:10px;font-size:.9rem;font-weight:500;cursor:pointer;font-family:inherit;transition:background .15s}
        .consent__btn:hover{background:#C9503F}
        .consent__link{font-size:.82rem;color:#7A7770;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
        .consent__link:hover{color:#1C1C1A}
        @media(max-width:640px){.consent__actions{flex-direction:column-reverse;align-items:stretch}.consent__btn{text-align:center}}
      `}</style>
    </>
  );
}
