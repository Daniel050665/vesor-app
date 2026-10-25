"use client";

import { useEffect, useState } from "react";
import type { MarketQuote } from "@/lib/market-data";

type MarketResponse = {
  quotes: MarketQuote[];
  isDemo: boolean;
  warning: string | null;
};

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default function MarketBoard() {
  const [data, setData] = useState<MarketResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/market")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "No se pudieron cargar las cotizaciones.");
        return payload as MarketResponse;
      })
      .then(setData)
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "No se pudieron cargar las cotizaciones.");
      });
  }, []);

  return (
    <section className="market-section" aria-labelledby="market-heading">
      <div className="section-heading">
        <div>
          <h2 id="market-heading">Empresas que puedes seguir</h2>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {!data && !error && <p className="muted">Cargando cotizaciones…</p>}
      {data?.warning && <div className="info">{data.warning}</div>}
      {data?.isDemo && <p className="market-disclaimer">Datos de demostración. Configura un proveedor para consultar cotizaciones.</p>}

      {data && data.quotes.length > 0 && (
        <div className="market-grid">
          {data.quotes.map((quote) => (
            <article className="market-quote" key={quote.symbol}>
              <div className="market-quote-topline">
                <strong>{quote.symbol}</strong>
                <span>{quote.name}</span>
              </div>
              <div className="market-price">{money.format(quote.price)}</div>
              <div className={quote.changePct !== null && quote.changePct >= 0 ? "market-change positive" : "market-change negative"}>
                {quote.changePct !== null ? `${quote.changePct >= 0 ? "+" : ""}${quote.changePct.toFixed(2)}%` : "Sin variación"}
              </div>
              <p className="market-updated">{quote.updatedAt}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
