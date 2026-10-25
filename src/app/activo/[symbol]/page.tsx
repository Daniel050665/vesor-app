import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { ASSET_TYPE_LABEL, VOLATILITY_INFO } from "@/lib/assets";
import { getAssetSnapshot } from "@/lib/market-data";
import { listNews, newsCategoryLabel } from "@/lib/news";
import { logActivity } from "@/lib/activity";
import { num, pct, timeAgo, usd } from "@/lib/format";
import { interestLabel } from "@/lib/validation";
import LineChart from "@/components/LineChart";
import WatchButton from "@/components/WatchButton";
import { QuoteSource } from "@/components/AssetCards";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { symbol: string } }) {
  return { title: `${params.symbol.toUpperCase()} — Vesor` };
}

export default async function ActivoPage({ params }: { params: { symbol: string } }) {
  const user = await requireUser(`/activo/${params.symbol}`);
  const snap = await getAssetSnapshot(params.symbol);
  if (!snap) notFound();
  const { asset, quote, history, indicators: ind } = snap;

  await logActivity(user.id, "asset_view", `${asset.symbol} · ${asset.name}`, { symbol: asset.symbol, fuente: quote.isDemo ? "Demo" : quote.source }, { target: asset.symbol, windowMinutes: 15 });
  const watching = Boolean(await queryOne(`select 1 from watchlist where user_id = $1 and symbol = $2`, [user.id, asset.symbol]));
  const news = await listNews({ q: asset.name.split(" ")[0], limit: 5 }).catch(() => []);
  const beginner = user.experience === "principiante";
  const tolerance = user.risk_tolerance;
  const tooVolatile = tolerance && { baja: 0, media: 1, alta: 2 }[asset.volatility] > { baja: 0, media: 1, alta: 2 }[tolerance];

  const rsiText =
    ind?.rsi14 === null || !ind
      ? "Sin datos suficientes."
      : ind.rsi14 > 70
        ? "Sobre 70: subió rápido; históricamente es una zona donde aumentan las correcciones."
        : ind.rsi14 < 30
          ? "Bajo 30: cayó con fuerza; puede rebotar o seguir cayendo."
          : "Entre 30 y 70: zona neutral.";

  return (
    <div>
      <p className="muted" style={{ marginTop: 0 }}><Link href="/mercado">← Mercado</Link></p>
      <div className="asset-hero">
        <div>
          <p className="eyebrow">{ASSET_TYPE_LABEL[asset.type]} · {asset.sector}</p>
          <h1 style={{ fontSize: 34, margin: 0 }}>{asset.name} <span className="muted" style={{ fontSize: 22 }}>{asset.symbol}</span></h1>
          <div className="asset-meta" style={{ marginTop: 10 }}>
            <span className={`chip vol-${asset.volatility}`}>{VOLATILITY_INFO[asset.volatility].label}</span>
            {asset.interests.map((i) => <span key={i} className="chip">{interestLabel(i)}</span>)}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="price">{usd(quote.price)}</div>
          <div className={quote.changePct !== null && quote.changePct >= 0 ? "up" : "down"}>{pct(quote.changePct)} <QuoteSource quote={quote} /></div>
          <p className="muted small" style={{ margin: "4px 0 10px" }}>{quote.updatedAt}</p>
          <div className="actions" style={{ marginTop: 0, justifyContent: "flex-end" }}>
            <WatchButton symbol={asset.symbol} watching={watching} />
            <Link href={`/chat?q=${encodeURIComponent(`Analiza ${asset.symbol}: ventajas, riesgos e indicadores`)}`} className="pill pill-outline">Analizar con el asistente</Link>
          </div>
        </div>
      </div>

      {tooVolatile && (
        <div className="error" style={{ marginTop: 18 }}>
          Este activo es más volátil de lo que indica tu tolerancia al riesgo ({tolerance}). {VOLATILITY_INFO[asset.volatility].loss}
        </div>
      )}

      <section className="card section">
        <div className="section-head">
          <h2>Precio de los últimos {history?.points.length ?? 0} días</h2>
          {history?.isDemo ? <span className="demo-note">Serie simulada para demostración</span> : <span className="real-note">Fuente: {history?.source}</span>}
        </div>
        {history && <LineChart points={history.points} label={`Evolución del precio de ${asset.symbol}`} />}
      </section>

      {ind && (
        <section className="section">
          <div className="section-head">
            <h2>Indicadores {history?.isDemo && <span className="demo-note">calculados sobre datos simulados</span>}</h2>
          </div>
          <div className="kv">
            <div><span>Rendimiento 30 días</span><strong className={(ind.return30d ?? 0) >= 0 ? "up" : "down"}>{pct(ind.return30d, 1)}</strong></div>
            <div><span>Rendimiento 90 días</span><strong className={(ind.return90d ?? 0) >= 0 ? "up" : "down"}>{pct(ind.return90d, 1)}</strong></div>
            <div><span>Volatilidad anualizada</span><strong>{num(ind.volatilityAnnual, 0)}%</strong></div>
            <div><span>Caída máxima del periodo</span><strong className="down">{pct(ind.maxDrawdown, 1)}</strong></div>
            <div><span>Media móvil 20 días</span><strong>{num(ind.sma20)}</strong></div>
            <div><span>Media móvil 50 días</span><strong>{num(ind.sma50)}</strong></div>
            <div><span>RSI 14</span><strong>{num(ind.rsi14, 0)}</strong></div>
            <div><span>Tendencia</span><strong style={{ textTransform: "capitalize" }}>{ind.trend}</strong></div>
          </div>
          <div className="card" style={{ marginTop: 12 }}>
            <h3 style={{ marginTop: 0, fontSize: 16 }}>Cómo leer estos datos</h3>
            <ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>
              <li><strong>RSI:</strong> {rsiText}</li>
              <li><strong>Volatilidad:</strong> {beginner ? "cuánto se mueve el precio. Más volatilidad = subidas y bajadas más bruscas." : "desviación estándar anualizada de los rendimientos diarios logarítmicos."}</li>
              <li><strong>Caída máxima:</strong> la peor pérdida desde un máximo dentro del periodo mostrado; en el futuro podría ser mayor.</li>
              <li><strong>Tendencia:</strong> {beginner ? "compara el precio promedio de 20 días con el de 50 días." : "cruce SMA20/SMA50 con confirmación del último cierre; es una señal rezagada."}</li>
            </ul>
            <p className="disclaimer">Los indicadores describen el pasado y no predicen el comportamiento futuro.</p>
          </div>
        </section>
      )}

      <div className="grid-2 section">
        <section className="card">
          <h2 style={{ fontSize: 18 }}>Ventajas y riesgos</h2>
          <p><strong>Qué es:</strong> {asset.description}</p>
          <p><strong>Riesgos principales:</strong> {asset.risks}</p>
          <p><strong>Pérdidas posibles:</strong> {VOLATILITY_INFO[asset.volatility].loss}</p>
          {asset.type !== "etf" && <p className="muted">Concentrar dinero en un solo activo aumenta el riesgo; compáralo con un ETF diversificado.</p>}
        </section>
        <section className="card">
          <h2 style={{ fontSize: 18 }}>Noticias relacionadas</h2>
          {news.length === 0 ? (
            <p className="muted">No encontramos noticias recientes que mencionen a {asset.name}.</p>
          ) : (
            <div className="news-compact">
              {news.map((n) => (
                <a key={n.id} href={`/api/news/open?id=${n.id}`} target="_blank" rel="noopener noreferrer">
                  {n.title}
                  <small>{n.source_name} · {newsCategoryLabel(n.category)} · {timeAgo(n.published_at)}</small>
                </a>
              ))}
            </div>
          )}
        </section>
      </div>
      <p className="footer-note">Información educativa. No es una recomendación de compra o venta.</p>
    </div>
  );
}
