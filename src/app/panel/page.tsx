import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { ASSETS, findAsset } from "@/lib/assets";
import { CRYPTO_SYMBOLS, MARKET_OVERVIEW_SYMBOLS, getQuotes } from "@/lib/market-data";
import { newsCategoriesFor, recommendAssets } from "@/lib/personalization";
import { listNews } from "@/lib/news";
import { interestLabel } from "@/lib/validation";
import { ACTIVITY_TYPES, type ActivityType } from "@/lib/activity";
import { pct, timeAgo, usd } from "@/lib/format";
import { AssetCard, RecommendationCard } from "@/components/AssetCards";
import OnboardingCarousel from "@/components/OnboardingCarousel";
import CryptoTicker from "@/components/CryptoTicker";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mi panel — Vesor" };

export default async function PanelPage({ searchParams }: { searchParams: { denegado?: string; bienvenida?: string } }) {
  const user = await requireUser("/panel");
  const watchlist = (await query<{ symbol: string }>(`select symbol from watchlist where user_id = $1 order by created_at`, [user.id])).map((w) => w.symbol);
  const interestAssets = ASSETS.filter((a) => a.interests.some((i) => user.interests.includes(i)) && !watchlist.includes(a.symbol)).slice(0, 8);
  const recs = recommendAssets(user, watchlist, 4);

  const [quotes, news, activity] = await Promise.all([
    getQuotes(Array.from(new Set([...MARKET_OVERVIEW_SYMBOLS, ...CRYPTO_SYMBOLS, ...watchlist]))),
    listNews({ categories: newsCategoriesFor(user.interests), userId: user.id, limit: 4 }).catch(() => null),
    query<{ id: string; type: ActivityType; title: string; created_at: string }>(
      `select id, type, title, created_at from activity_log where user_id = $1 order by created_at desc limit 4`,
      [user.id]
    ),
  ]);
  const quoteOf = new Map(quotes.map((q) => [q.symbol, q]));
  const overview = MARKET_OVERVIEW_SYMBOLS.map((s) => quoteOf.get(s)).filter(Boolean);
  const anyDemo = overview.some((q) => q!.isDemo);

  return (
    <div>
      {searchParams.bienvenida && <OnboardingCarousel name={user.full_name.split(" ")[0]} />}
      {searchParams.denegado && <div className="error" style={{ marginTop: 0, marginBottom: 18 }}>Esa sección es solo para administradores.</div>}
      <div className="page-head">
        <div>
          <h1>Hola, {user.full_name.split(" ")[0]}</h1>
          <p className="muted">
            {user.interests.map(interestLabel).join(" · ")} · <Link href="/perfil">Editar</Link>
          </p>
        </div>
        <div className="actions" style={{ marginTop: 0 }}>
          <Link href="/chat" className="pill pill-primary">Preguntar a la IA</Link>
          <Link href="/analizar" className="pill pill-outline">Analizar riesgo</Link>
        </div>
      </div>

      <CryptoTicker initial={CRYPTO_SYMBOLS.map((s) => quoteOf.get(s)!).filter(Boolean)} />

      <section className="section" aria-labelledby="mercado-h">
        <div className="section-head">
          <h2 id="mercado-h">Índices</h2>
          {anyDemo && <span className="muted small">Precios demo</span>}
        </div>
        <div className="ticker-grid">
          {overview.map((q) => (
            <Link key={q!.symbol} href={`/activo/${q!.symbol}`} className="ticker-card" title={findAsset(q!.symbol)?.name}>
              <span>{q!.symbol}</span>
              <strong>{usd(q!.price)}</strong>
              <small className={q!.changePct !== null && q!.changePct >= 0 ? "up" : "down"}>{pct(q!.changePct)}</small>
            </Link>
          ))}
        </div>
      </section>

      <div className="dash-grid section">
        <div>
          <section aria-labelledby="watch-h">
            <div className="section-head">
              <h2 id="watch-h">Siguiendo</h2>
              <Link href="/mercado">Explorar →</Link>
            </div>
            {watchlist.length === 0 ? (
              <div className="empty">Sigue activos desde el <Link href="/mercado">mercado</Link> para verlos aquí.</div>
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
              <h2 id="recs-h">Ideas para ti</h2>
              <span className="muted small">No son recomendaciones de compra</span>
            </div>
            <div className="grid-2">{recs.map((r) => <RecommendationCard key={r.asset.symbol} rec={r} />)}</div>
          </section>

          <section className="section" aria-labelledby="interest-h">
            <div className="section-head">
              <h2 id="interest-h">De tus intereses</h2>
              <Link href="/mercado?mios=1">Ver todos →</Link>
            </div>
            <div className="chip-links">
              {interestAssets.map((a) => (
                <Link key={a.symbol} href={`/activo/${a.symbol}`} className="toggle" title={a.name}>{a.symbol}</Link>
              ))}
            </div>
          </section>
        </div>

        <aside>
          <section className="card" aria-labelledby="news-h">
            <div className="section-head">
              <h2 id="news-h" style={{ fontSize: 18 }}>Noticias</h2>
              <Link href="/noticias?mias=1">Más →</Link>
            </div>
            {news === null ? (
              <p className="muted">No pudimos cargar las noticias.</p>
            ) : news.length === 0 ? (
              <p className="muted">Sin noticias recientes de tus temas.</p>
            ) : (
              <div className="news-compact">
                {news.map((n) => (
                  <a key={n.id} href={`/api/news/open?id=${n.id}`} target="_blank" rel="noopener noreferrer">
                    {n.title}
                    <small>{n.source_name} · {timeAgo(n.published_at)}</small>
                  </a>
                ))}
              </div>
            )}
          </section>

          <section className="card" aria-labelledby="act-h">
            <div className="section-head">
              <h2 id="act-h" style={{ fontSize: 18 }}>Tu actividad</h2>
              <Link href="/historial">Ver todo →</Link>
            </div>
            {activity.length === 0 ? (
              <p className="muted">Sin actividad todavía.</p>
            ) : (
              <div className="news-compact">
                {activity.map((a) => (
                  <Link key={a.id} href="/historial">
                    {a.title}
                    <small>
                      {a.title === ACTIVITY_TYPES[a.type] ? "" : `${ACTIVITY_TYPES[a.type] ?? a.type} · `}
                      {timeAgo(a.created_at)}
                    </small>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>

      <p className="footer-note">Información educativa. No es asesoría financiera.</p>
    </div>
  );
}
