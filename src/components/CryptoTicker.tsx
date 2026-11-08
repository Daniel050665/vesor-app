"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { MarketQuote } from "@/lib/market-data";

const REFRESH_MS = 60_000;

const price = (n: number) =>
  n.toLocaleString("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: n < 1 ? 4 : n < 100 ? 2 : 0 });

/** Cinta de criptomonedas que se desplaza sola y se actualiza cada minuto. */
export default function CryptoTicker({ initial }: { initial: MarketQuote[] }) {
  const [quotes, setQuotes] = useState(initial);
  const [flash, setFlash] = useState<Record<string, "up" | "down">>({});
  const [updated, setUpdated] = useState<Date>(() => new Date());
  const [stale, setStale] = useState(false);
  const previous = useRef(new Map(initial.map((q) => [q.symbol, q.price])));

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/market/crypto", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { quotes: MarketQuote[] };
        if (!alive || !data.quotes.length) return;
        const changes: Record<string, "up" | "down"> = {};
        for (const q of data.quotes) {
          const before = previous.current.get(q.symbol);
          if (before !== undefined && before !== q.price) changes[q.symbol] = q.price > before ? "up" : "down";
          previous.current.set(q.symbol, q.price);
        }
        setQuotes(data.quotes);
        setFlash(changes);
        setUpdated(new Date());
        setStale(false);
        window.setTimeout(() => alive && setFlash({}), 1500);
      } catch {
        if (alive) setStale(true);
      }
    };
    const timer = window.setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  if (!quotes.length) return null;
  const live = quotes.some((q) => !q.isDemo);
  // La lista se duplica para que el desplazamiento sea continuo.
  const items = [...quotes, ...quotes];

  return (
    <section className="ticker-live" aria-label="Cotizaciones de criptomonedas">
      <span className={`ticker-badge ${live && !stale ? "" : "is-off"}`} title={`Actualizado ${updated.toLocaleTimeString("es-CO")}`}>
        <i aria-hidden="true" />
        {live && !stale ? "En vivo" : "Sin conexión"}
      </span>
      <div className="ticker-viewport">
        <div className="ticker-track" style={{ animationDuration: `${quotes.length * 4}s` }}>
          {items.map((q, i) => (
            <Link
              key={`${q.symbol}-${i}`}
              href={`/activo/${q.symbol}`}
              className={`ticker-item ${flash[q.symbol] ? `flash-${flash[q.symbol]}` : ""}`}
              aria-hidden={i >= quotes.length}
              tabIndex={i >= quotes.length ? -1 : undefined}
            >
              <strong>{q.symbol}</strong>
              <span>{price(q.price)}</span>
              <small className={q.changePct !== null && q.changePct >= 0 ? "up" : "down"}>
                {q.changePct === null ? "" : `${q.changePct >= 0 ? "▲" : "▼"} ${Math.abs(q.changePct).toFixed(2)}%`}
              </small>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
