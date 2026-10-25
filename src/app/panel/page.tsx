import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { ASSETS, findAsset } from "@/lib/assets";
import { MARKET_OVERVIEW_SYMBOLS, getQuotes } from "@/lib/market-data";
import { newsCategoriesFor, recommendAssets } from "@/lib/personalization";
import { listNews, newsCategoryLabel } from "@/lib/news";
import { interestLabel } from "@/lib/validation";
import { ACTIVITY_TYPES, type ActivityType } from "@/lib/activity";
import { pct, timeAgo, usd } from "@/lib/format";
import { AssetCard, QuoteSource, RecommendationCard } from "@/components/AssetCards";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mi panel — Vesor" };

const LEVEL_TEXT = {
  principiante: "Te explicaremos cada concepto paso a paso.",
  intermedio: "Verás indicadores clave con explicaciones breves.",
  avanzado: "Verás indicadores técnicos y comparaciones detalladas.",
};

export default async function PanelPage({ searchParams }: { searchParams: { denegado?: string } }) {
  const user = await requireUser("/panel");
  const watchlist = (await query<{ symbol: string }>(`select symbol from watchlist where user_id = $1 order by created_at`, [user.id])).map((w) => w.symbol);
  const interestAssets = ASSETS.filter((a) => a.interests.some((i) => user.interests.includes(i)) && !watchlist.includes(a.symbol)).slice(0, 6);
  const recs = recommendAssets(user, watchlist, 6);

  const [quotes, news, activity] = await Promise.all([
    getQuotes(Array.from(new Set([...MARKET_OVERVIEW_SYMBOLS, ...watchlist, ...interestAssets.map((a) => a.symbol)]))),
    listNews({ categories: newsCategoriesFor(user.interests), userId: user.id, limit: 6 }).catch(() => null),
    query<{ id: string; type: ActivityType; title: string; created_at: string }>(
      `select id, type, title, created_at from activity_log where user_id = $1 order by created_at desc limit 6`,
      [user.id]
    ),
  ]);
  const quoteOf = new Map(quotes.map((q) => [q.symbol, q]));
  const overview = MARKET_OVERVIEW_SYMBOLS.map((s) => quoteOf.get(s)).filter(Boolean);
  const anyDemo = overview.some((q) => q!.isDemo);

  return (
    <div>
      {searchParams.denegado && <div className="error" style={{ marginTop: 0, marginBottom: 18 }}>Esa sección es exclusiva para administradores.</div>}
      <div className="page-head">
        <div>
          <p className="eyebrow">Tu panel</p>
          <h1>Hola, {user.full_name.split(" ")[0]}</h1>
          <p className="muted">
            Nivel {user.experience}. {LEVEL_TEXT[user.experience]} Intereses: {user.interests.map(interestLabel).join(", ")}.{" "}
            <Link href="/perfil">Editar preferencias</Link>
          </p>
        </div>
        <div className="actions" style={{ marginTop: 0 }}>
          <Link href="/chat" className="pill pill-primary">Preguntar al asistente</Link>
          <Link href="/analizar" className="pill pill-outline">Analizar un escenario</Link>
        </div>
      </div>

      <section aria-labelledby="mercado-h">
        <div className="section-head">
          <h2 id="mercado-h">Resumen del mercado</h2>
          {anyDemo && <span className="demo-note">Acciones y ETF con datos de demostración · cripto en vivo vía CoinGecko</span>}
        </div>
        <div className="stat-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
          {overview.map((q) => (
            <Link key={q!.symbol} href={`/activo/${q!.symbol}`} className="stat" style={{ color: "inherit", textDecoration: "none" }}>
              <span>{q!.symbol} · {findAsset(q!.symbol)?.sector}</span>
              <strong>{usd(q!.price)}</strong>
              <small className={q!.changePct !== null && q!.changePct >= 0 ? "up" : "down"}>{pct(q!.changePct)}</small>{" "}
              <QuoteSource quote={q!} />
            </Link>
          ))}
        </div>
      </section>

      <div className="dash-grid section">
        <div>
          <section aria-labelledby="watch-h">
            <div className="section-head">
              <h2 id="watch-h">Mi lista de seguimiento</h2>
              <Link href="/mercado">Explorar activos →</Link>
            </div>
            {watchlist.length === 0 ? (
              <div className="empty">Aún no sigues ningún activo. Agrega algunos desde el <Link href="/mercado">mercado</Link> para verlos aquí.</div>
            ) : (
              <div className="grid-2">
                {watchlist.map((s) => {
                  const asset = findAsset(s);
                  return asset ? <AssetCard key={s} asset={asset} quote={quoteOf.get(s)} watching /> : null;
                })}
              </div>
            )}
          </section>

          <section className="section" aria-labelledby="recs-h">
            <div className="section-head">
              <h2 id="recs-h">Ideas para investigar según tu perfil</h2>
            </div>
            <p className="muted" style={{ marginTop: -6 }}>
              Calculadas con tus intereses, tu nivel y tu tolerancia al riesgo{user.risk_tolerance ? ` (${user.risk_tolerance})` : " (no indicada: asumimos prudencia)"}. No son recomendaciones de compra:
              revisa la volatilidad y las pérdidas posibles de cada una.
            </p>
            <div className="grid-2">{recs.map((r) => <RecommendationCard key={r.asset.symbol} rec={r} />)}</div>
          </section>

          <section className="section" aria-labelledby="interest-h">
            <div className="section-head">
              <h2 id="interest-h">Activos de tus intereses</h2>
              <Link href="/mercado?mios=1">Ver todos →</Link>
            </div>
            <div className="grid-3">
              {interestAssets.map((a) => <AssetCard key={a.symbol} asset={a} quote={quoteOf.get(a.symbol)} watching={false} />)}
            </div>
          </section>
        </div>

        <aside>
          <section className="card" aria-labelledby="news-h">
            <div className="section-head">
              <h2 id="news-h" style={{ fontSize: 18 }}>Noticias para ti</h2>
              <Link href="/noticias?mias=1">Más →</Link>
            </div>
            {news === null ? (
              <p className="muted">No pudimos cargar las noticias en este momento.</p>
            ) : news.length === 0 ? (
              <p className="muted">Aún no hay noticias recientes de tus temas. Vuelve en unos minutos.</p>
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

          <section className="card" aria-labelledby="chat-h">
            <h2 id="chat-h" style={{ fontSize: 18 }}>Asistente de análisis</h2>
            <p className="muted">Pregunta por un activo, compara opciones o pide que te expliquen un concepto.</p>
            <div className="suggestions">
              {[
                user.experience === "principiante" ? "¿Qué es un ETF?" : "¿Qué indica el RSI de NVDA?",
                watchlist[0] ? `Analiza ${watchlist[0]}` : "Compara SPY con QQQ",
                "¿Qué podría investigar según mis intereses?",
              ].map((s) => (
                <Link key={s} href={`/chat?q=${encodeURIComponent(s)}`} className="toggle">{s}</Link>
              ))}
            </div>
          </section>

          <section className="card" aria-labelledby="act-h">
            <div className="section-head">
              <h2 id="act-h" style={{ fontSize: 18 }}>Actividad reciente</h2>
              <Link href="/historial">Historial →</Link>
            </div>
            {activity.length === 0 ? (
              <p className="muted">Sin actividad todavía.</p>
            ) : (
              <div className="news-compact">
                {activity.map((a) => (
                  <Link key={a.id} href="/historial">
                    {a.title}
                    <small>{ACTIVITY_TYPES[a.type] ?? a.type} · {timeAgo(a.created_at)}</small>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>

      <p className="footer-note">
        Vesor es una herramienta informativa y educativa. Los análisis no garantizan rendimientos ni sustituyen tu evaluación personal del riesgo.
      </p>
    </div>
  );
}
