"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Cycle = "mensual" | "anual";
type Sub = { billing_cycle: Cycle; price_cop: number; receipt_code: string; renews_at: string };

const PRICES = { mensual: 14_900, anual: 149_000 };
const cop = (n: number) => n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const date = (d: string) => new Date(d).toLocaleDateString("es-CO", { dateStyle: "long", timeZone: "America/Bogota" });

const FEATURES = {
  gratis: ["Panel, mercado y noticias", "Análisis de riesgo ilimitado", "20 consultas a la IA al mes"],
  premium: ["Todo lo del plan Gratis", "Consultas a la IA sin límite", "Comparaciones avanzadas de activos", "Soporte prioritario"],
  empresas: ["Vesor con la marca de tu entidad", "Educación financiera para tus usuarios", "Panel de métricas y prevención de fraude"],
};

export default function PlansView({
  loggedIn,
  plan,
  used,
  limit,
  subscription,
}: {
  loggedIn: boolean;
  plan: "gratis" | "premium" | null;
  used: number;
  limit: number | null;
  subscription: Sub | null;
}) {
  const router = useRouter();
  const [cycle, setCycle] = useState<Cycle>("mensual");
  const [checkout, setCheckout] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function cancel() {
    if (!window.confirm("¿Cancelar tu plan Premium? Volverás al plan Gratis.")) return;
    setBusy(true);
    const res = await fetch("/api/subscription", { method: "DELETE" }).catch(() => null);
    setBusy(false);
    setMessage(res?.ok ? "Tu plan Premium se canceló. Ahora estás en el plan Gratis." : "No pudimos cancelar el plan.");
    router.refresh();
  }

  async function contactSales() {
    if (!loggedIn) return router.push("/login?next=/planes");
    await fetch("/api/subscription/interest", { method: "POST" }).catch(() => null);
    setMessage("¡Gracias! Registramos tu interés en el plan Empresas; el equipo de Vesor te contactará.");
  }

  const yearlySaving = PRICES.mensual * 12 - PRICES.anual;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Planes</h1>
          <p className="muted">Empieza gratis y mejora cuando lo necesites.</p>
        </div>
        <div className="toggle-group" role="radiogroup" aria-label="Ciclo de pago">
          <button className="toggle" role="radio" aria-checked={cycle === "mensual"} onClick={() => setCycle("mensual")}>Mensual</button>
          <button className="toggle" role="radio" aria-checked={cycle === "anual"} onClick={() => setCycle("anual")}>
            Anual <span className="save-chip">Ahorra {cop(yearlySaving)}</span>
          </button>
        </div>
      </div>

      <p className="demo-banner">Modo demostración: los pagos son simulados y no se cobra nada.</p>

      {loggedIn && plan === "gratis" && limit !== null && (
        <div className="usage card">
          <div className="usage-head">
            <strong>Tu plan: Gratis</strong>
            <span className="muted small">{Math.min(used, limit)} de {limit} consultas a la IA este mes</span>
          </div>
          <div className="usage-bar" role="progressbar" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={Math.min(used, limit)}>
            <span style={{ width: `${Math.min(100, (used / limit) * 100)}%` }} />
          </div>
        </div>
      )}
      {loggedIn && plan === "premium" && subscription && (
        <div className="usage card">
          <div className="usage-head">
            <strong>Tu plan: Premium ★</strong>
            <span className="muted small">
              {subscription.billing_cycle === "anual" ? "Anual" : "Mensual"} · {cop(subscription.price_cop)} · se renueva el {date(subscription.renews_at)} · recibo {subscription.receipt_code}
            </span>
          </div>
          <button className="pill pill-outline pill-sm" onClick={cancel} disabled={busy}>Cancelar plan</button>
        </div>
      )}
      {message && <div className="info" role="status" style={{ marginBottom: 16 }}>{message}</div>}

      <div className="plans">
        <article className="plan">
          <h2>Gratis</h2>
          <p className="plan-price">{cop(0)}</p>
          <ul>{FEATURES.gratis.map((f) => <li key={f}>{f}</li>)}</ul>
          {loggedIn ? (
            <button className="pill pill-outline block" disabled>{plan === "gratis" ? "Tu plan actual" : "Incluido"}</button>
          ) : (
            <Link href="/registro" className="pill pill-outline block">Crear cuenta</Link>
          )}
        </article>

        <article className="plan plan-featured">
          <span className="plan-badge">Recomendado</span>
          <h2>Premium</h2>
          <p className="plan-price">
            {cop(PRICES[cycle])}<small>/{cycle === "anual" ? "año" : "mes"}</small>
          </p>
          <ul>{FEATURES.premium.map((f) => <li key={f}>{f}</li>)}</ul>
          {plan === "premium" ? (
            <button className="pill pill-primary block" disabled>Tu plan actual</button>
          ) : loggedIn ? (
            <button className="pill pill-primary block" onClick={() => setCheckout(true)}>Mejorar a Premium</button>
          ) : (
            <Link href="/login?next=/planes" className="pill pill-primary block">Inicia sesión para mejorar</Link>
          )}
        </article>

        <article className="plan">
          <h2>Empresas</h2>
          <p className="plan-price plan-price-text">A la medida</p>
          <ul>{FEATURES.empresas.map((f) => <li key={f}>{f}</li>)}</ul>
          <button className="pill pill-outline block" onClick={contactSales}>Hablar con ventas</button>
        </article>
      </div>

      {checkout && (
        <Checkout
          cycle={cycle}
          onClose={() => setCheckout(false)}
          onDone={() => router.refresh()}
        />
      )}
    </div>
  );
}

/**
 * Checkout SIMULADO. Los campos de tarjeta solo existen en el navegador: no se validan, no se envían
 * al servidor y no se guardan. El servidor solo recibe el ciclo elegido.
 */
function Checkout({ cycle, onClose, onDone }: { cycle: Cycle; onClose: () => void; onDone: () => void }) {
  const [card, setCard] = useState({ name: "", number: "", exp: "", cvc: "" });
  const [step, setStep] = useState<"form" | "processing" | "done">("form");
  const [receipt, setReceipt] = useState<{ code: string; renews: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formatNumber = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
  const formatExp = (v: string) => v.replace(/\D/g, "").slice(0, 4).replace(/^(\d{2})(\d)/, "$1/$2");

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStep("processing");
    await new Promise((r) => setTimeout(r, 1200));
    const res = await fetch("/api/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cycle }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) {
      setError(data.error || "No pudimos procesar el pago simulado.");
      setStep("form");
      return;
    }
    setCard({ name: "", number: "", exp: "", cvc: "" });
    setReceipt({ code: data.subscription.receipt_code, renews: data.subscription.renews_at });
    setStep("done");
    onDone();
  }

  return (
    <div className="onb-backdrop" role="dialog" aria-modal="true" aria-labelledby="co-title" onClick={(e) => e.target === e.currentTarget && step !== "processing" && onClose()}>
      <div className="checkout">
        {step === "done" && receipt ? (
          <div className="checkout-done">
            <div className="onb-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></div>
            <h2 id="co-title">¡Bienvenido a Premium!</h2>
            <p className="muted">Pago aprobado (simulado). Ya tienes consultas a la IA sin límite.</p>
            <p className="small muted">Recibo {receipt.code} · se renueva el {date(receipt.renews)}</p>
            <div className="onb-actions">
              <button className="pill pill-outline" onClick={onClose}>Cerrar</button>
              <Link href="/chat" className="pill pill-primary">Ir al asistente</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={pay} autoComplete="off">
            <button type="button" className="onb-skip" onClick={onClose} disabled={step === "processing"}>Cerrar</button>
            <h2 id="co-title">Plan Premium {cycle}</h2>
            <p className="checkout-total">{cop(PRICES[cycle])}<small>/{cycle === "anual" ? "año" : "mes"}</small></p>
            <p className="demo-banner">Demostración: no se cobra nada y estos datos no se envían ni se guardan. No escribas una tarjeta real.</p>
            <label htmlFor="co-name">Nombre en la tarjeta</label>
            <input id="co-name" autoComplete="off" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} placeholder="Como aparece en la tarjeta" />
            <label htmlFor="co-number">Número de tarjeta</label>
            <input id="co-number" inputMode="numeric" autoComplete="off" value={card.number} onChange={(e) => setCard({ ...card, number: formatNumber(e.target.value) })} placeholder="4242 4242 4242 4242" />
            <div className="row">
              <div>
                <label htmlFor="co-exp">Vencimiento</label>
                <input id="co-exp" inputMode="numeric" autoComplete="off" value={card.exp} onChange={(e) => setCard({ ...card, exp: formatExp(e.target.value) })} placeholder="MM/AA" />
              </div>
              <div>
                <label htmlFor="co-cvc">CVC</label>
                <input id="co-cvc" inputMode="numeric" autoComplete="off" value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="123" />
              </div>
            </div>
            {error && <div className="error" role="alert">{error}</div>}
            <button className="btn block" disabled={step === "processing"}>
              {step === "processing" ? "Procesando pago…" : `Pagar ${cop(PRICES[cycle])} (simulado)`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
