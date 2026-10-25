import { query } from "./db";

export const NEWS_CATEGORIES = [
  { value: "mercados", label: "Mercados" },
  { value: "economia", label: "Economía" },
  { value: "tecnologia", label: "Tecnología y fintech" },
  { value: "cripto", label: "Criptomonedas" },
  { value: "energia", label: "Energía" },
  { value: "salud", label: "Salud" },
  { value: "finanzas", label: "Finanzas" },
] as const;

export const newsCategoryLabel = (value: string) => NEWS_CATEGORIES.find((c) => c.value === value)?.label ?? value;

const REFRESH_MINUTES = 30;
const MAX_AGE_DAYS = 14;

export type NewsSource = {
  id: number;
  name: string;
  url: string;
  category: string;
  provider: string;
  enabled: boolean;
  last_fetched_at: string | null;
  last_status: string | null;
  last_error: string | null;
  last_count: number;
};

export type NewsArticle = {
  id: string;
  title: string;
  url: string;
  summary: string | null;
  category: string;
  source_name: string;
  published_at: string;
  saved?: boolean;
};

type ParsedItem = { title: string; url: string; summary: string; publishedAt: Date };

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decode(text: string) {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

function stripHtml(text: string) {
  return decode(decode(text).replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function tag(block: string, name: string) {
  const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i").exec(block);
  return m ? m[1].trim() : "";
}

/** Parser mínimo de RSS 2.0 y Atom: título, enlace, resumen y fecha. */
export function parseFeed(xml: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ?? [];
  for (const block of blocks) {
    const title = stripHtml(tag(block, "title"));
    let url = decode(tag(block, "link"));
    if (!url) url = /<link[^>]*href="([^"]+)"/i.exec(block)?.[1] ?? "";
    url = url.trim();
    const summary = stripHtml(tag(block, "description") || tag(block, "summary") || tag(block, "content")).slice(0, 400);
    const dateText = tag(block, "pubDate") || tag(block, "published") || tag(block, "updated") || tag(block, "dc:date");
    const publishedAt = new Date(decode(dateText));
    if (!title || !/^https?:\/\//.test(url) || Number.isNaN(publishedAt.getTime())) continue;
    items.push({ title, url, summary, publishedAt });
  }
  return items;
}

/** Clave para detectar la misma noticia publicada por varias fuentes con distinto enlace. */
export function titleKey(title: string) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function cleanUrl(url: string) {
  try {
    const u = new URL(url);
    for (const p of Array.from(u.searchParams.keys())) if (/^utm_|^\.tsrc$|^yptr$/.test(p)) u.searchParams.delete(p);
    return u.toString();
  } catch {
    return url;
  }
}

export async function fetchSource(source: NewsSource) {
  try {
    const response = await fetch(source.url, {
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; VesorNewsBot/1.0; +https://vesor-group.vercel.app)", Accept: "application/rss+xml, application/xml, text/xml" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`La fuente respondió HTTP ${response.status}`);
    const items = parseFeed(await response.text());
    const minDate = Date.now() - MAX_AGE_DAYS * 86_400_000;
    let inserted = 0;
    for (const item of items) {
      if (item.publishedAt.getTime() < minDate || item.publishedAt.getTime() > Date.now() + 3_600_000) continue;
      const rows = await query(
        `insert into news_articles (source_id, source_name, title, title_key, url, summary, category, published_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         on conflict do nothing returning id`,
        [source.id, source.provider, item.title.slice(0, 300), titleKey(item.title), cleanUrl(item.url), item.summary || null, source.category, item.publishedAt.toISOString()]
      );
      inserted += rows.length;
    }
    await query(
      `update news_sources set last_fetched_at = now(), last_status = 'ok', last_error = null, last_count = $2 where id = $1`,
      [source.id, items.length]
    );
    return { ok: true as const, parsed: items.length, inserted };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    await query(`update news_sources set last_fetched_at = now(), last_status = 'error', last_error = $2 where id = $1`, [
      source.id,
      message.slice(0, 300),
    ]);
    return { ok: false as const, error: message };
  }
}

let refreshing: Promise<void> | null = null;

/** Actualiza las fuentes habilitadas cuya última consulta tenga más de 30 minutos (o todas si force). */
export async function refreshNews(force = false) {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const sources = await query<NewsSource>(
      `select * from news_sources where enabled and ($1 or last_fetched_at is null or last_fetched_at < now() - interval '${REFRESH_MINUTES} minutes')`,
      [force]
    );
    await Promise.all(sources.map(fetchSource));
    await query(`delete from news_articles a where a.published_at < now() - interval '${MAX_AGE_DAYS} days'
      and not exists (select 1 from saved_news s where s.article_id = a.id)`);
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

export async function listNews(options: { categories?: string[]; userId?: string | null; limit?: number; savedOnly?: boolean; q?: string }) {
  // Si ya hay noticias guardadas, la actualización corre en segundo plano para no bloquear la página.
  const refresh = refreshNews().catch((error) => console.error("[news] Error al actualizar", error));
  const [{ count }] = await query<{ count: number }>(`select count(*)::int as count from news_articles`);
  if (count === 0) await refresh;
  const params: unknown[] = [options.userId ?? null];
  const where: string[] = [`a.published_at > now() - interval '${MAX_AGE_DAYS} days'`];
  if (options.savedOnly) where.length = 0;
  if (options.categories?.length) {
    params.push(JSON.stringify(options.categories));
    where.push(`a.category in (select jsonb_array_elements_text($${params.length}::jsonb))`);
  }
  if (options.savedOnly) where.push(`s.user_id is not null`);
  if (options.q) {
    params.push(`%${options.q.toLowerCase()}%`);
    where.push(`(lower(a.title) like $${params.length} or lower(coalesce(a.summary, '')) like $${params.length})`);
  }
  params.push(options.limit ?? 30);
  return query<NewsArticle>(
    `select a.id, a.title, a.url, a.summary, a.category, a.source_name, a.published_at, (s.user_id is not null) as saved
     from news_articles a
     left join saved_news s on s.article_id = a.id and s.user_id = $1
     ${where.length ? `where ${where.join(" and ")}` : ""}
     order by a.published_at desc limit $${params.length}`,
    params
  );
}

export async function newsSourcesStatus() {
  return query<NewsSource>(`select * from news_sources order by category, name`);
}
