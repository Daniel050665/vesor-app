import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { NEWS_CATEGORIES, listNews, newsCategoryLabel, newsSourcesStatus, type NewsArticle } from "@/lib/news";
import { newsCategoriesFor } from "@/lib/personalization";
import { dateTime, timeAgo } from "@/lib/format";
import SaveNewsButton from "@/components/SaveNewsButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Noticias financieras — Vesor" };

type Search = { cat?: string; mias?: string; guardadas?: string; q?: string };

function href(current: Search, patch: Partial<Search>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...current, ...patch })) if (v) params.set(k, v);
  const s = params.toString();
  return s ? `/noticias?${s}` : "/noticias";
}

export default async function NoticiasPage({ searchParams }: { searchParams: Search }) {
  const user = await getCurrentUser();
  const mine = Boolean(user && searchParams.mias);
  const savedOnly = Boolean(user && searchParams.guardadas);
  const validCat = NEWS_CATEGORIES.some((c) => c.value === searchParams.cat) ? searchParams.cat : undefined;
  const categories = validCat ? [validCat] : mine && user ? newsCategoriesFor(user.interests) : undefined;

  let articles: NewsArticle[] = [];
  let loadError = false;
  try {
    articles = await listNews({ categories, userId: user?.id, limit: 40, savedOnly, q: searchParams.q?.trim().slice(0, 80) || undefined });
  } catch (error) {
    console.error("[noticias]", error);
    loadError = true;
  }
  const sources = await newsSourcesStatus().catch(() => []);
  const enabled = sources.filter((s) => s.enabled);
  const failing = enabled.filter((s) => s.last_status === "error");
  const lastUpdate = enabled.map((s) => s.last_fetched_at).filter(Boolean).sort().pop();
  const providers = Array.from(new Set(enabled.map((s) => s.provider)));

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="eyebrow">Noticias financieras</p>
          <h1>Lo que mueve al mercado</h1>
          <p className="muted">
            Titulares de {providers.join(", ") || "fuentes públicas"} vía RSS oficial. Cada noticia enlaza a su publicación original
            {lastUpdate ? ` · actualizado ${timeAgo(lastUpdate)}` : ""}.
          </p>
        </div>
        <form action="/noticias" className="filters" style={{ margin: 0 }}>
          {validCat && <input type="hidden" name="cat" value={validCat} />}
          {mine && <input type="hidden" name="mias" value="1" />}
          <input name="q" defaultValue={searchParams.q} placeholder="Buscar en titulares" aria-label="Buscar noticias" style={{ width: 230 }} />
        </form>
      </div>

      <div className="filters">
        <Link href={href(searchParams, { cat: undefined, mias: undefined, guardadas: undefined })} className={`toggle ${!validCat && !mine && !savedOnly ? "on" : ""}`}>Todas</Link>
        {user && <Link href={href(searchParams, { mias: mine ? undefined : "1", cat: undefined, guardadas: undefined })} className={`toggle ${mine ? "on" : ""}`}>★ Mis intereses</Link>}
        {user && <Link href={href(searchParams, { guardadas: savedOnly ? undefined : "1", cat: undefined, mias: undefined })} className={`toggle ${savedOnly ? "on" : ""}`}>Guardadas</Link>}
        {NEWS_CATEGORIES.map((c) => (
          <Link key={c.value} href={href(searchParams, { cat: validCat === c.value ? undefined : c.value, mias: undefined, guardadas: undefined })} className={`toggle ${validCat === c.value ? "on" : ""}`}>
            {c.label}
          </Link>
        ))}
      </div>

      {failing.length > 0 && (
        <p className="demo-note" style={{ marginBottom: 14 }}>
          {failing.length} fuente(s) no respondieron en la última actualización ({failing.map((s) => s.provider).join(", ")}). Mostramos lo último disponible.
        </p>
      )}
      {loadError ? (
        <div className="error">No pudimos cargar las noticias en este momento. Intenta de nuevo en unos minutos.</div>
      ) : articles.length === 0 ? (
        <div className="empty">{savedOnly ? "Aún no has guardado noticias." : "No hay noticias recientes con estos filtros."}</div>
      ) : (
        <div className="news-list">
          {articles.map((n) => (
            <article key={n.id} className="news-card">
              <div className="news-meta">
                <span className="chip chip-accent">{newsCategoryLabel(n.category)}</span>
                <strong>{n.source_name}</strong>
                <time dateTime={new Date(n.published_at).toISOString()} title={dateTime(n.published_at)}>{timeAgo(n.published_at)}</time>
              </div>
              <h3><a href={`/api/news/open?id=${n.id}`} target="_blank" rel="noopener noreferrer">{n.title}</a></h3>
              {n.summary && <p>{n.summary}</p>}
              <div className="news-actions">
                <a className="pill pill-outline pill-sm" href={`/api/news/open?id=${n.id}`} target="_blank" rel="noopener noreferrer">Leer en {n.source_name} ↗</a>
                {user && <SaveNewsButton articleId={n.id} saved={Boolean(n.saved)} />}
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="footer-note">
        Los titulares pertenecen a sus respectivos medios y se muestran con enlace a la fuente original. La mayoría de fuentes publica en inglés.
        {!user && <> <Link href="/registro">Crea una cuenta</Link> para filtrar por tus intereses y guardar noticias.</>}
      </p>
    </div>
  );
}
