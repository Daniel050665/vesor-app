import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { NEWS_CATEGORIES } from "@/lib/news";
import NewsSourcesAdmin from "@/components/admin/NewsSourcesAdmin";

export const dynamic = "force-dynamic";

export default async function AdminNews() {
  await requireAdmin();
  const sources = await query<{
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
    articles: number;
  }>(
    `select s.*, (select count(*)::int from news_articles a where a.source_id = s.id) as articles
     from news_sources s order by s.category, s.name`
  );
  return (
    <NewsSourcesAdmin
      sources={sources.map((s) => ({ ...s, last_fetched_at: s.last_fetched_at ? new Date(s.last_fetched_at).toISOString() : null }))}
      categories={NEWS_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
    />
  );
}
