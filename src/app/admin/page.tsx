import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { databaseKind, query, queryOne } from "@/lib/db";
import { marketProviderStatus } from "@/lib/market-data";
import { newsSourcesStatus } from "@/lib/news";
import { timeAgo } from "@/lib/format";
import { ACTIVITY_TYPES, type ActivityType } from "@/lib/activity";

export const dynamic = "force-dynamic";

type Stats = {
  users: number;
  active: number;
  suspended: number;
  admins: number;
  new7: number;
  logins7: number;
  active7: number;
  chats7: number;
  sims: number;
  articles: number;
  conversations: number;
};

export default async function AdminHome() {
  await requireAdmin();
  const stats = (await queryOne<Stats>(`select
      (select count(*)::int from app_users) as users,
      (select count(*)::int from app_users where status = 'active') as active,
      (select count(*)::int from app_users where status = 'suspended') as suspended,
      (select count(*)::int from app_users where role = 'admin') as admins,
      (select count(*)::int from app_users where created_at > now() - interval '7 days') as new7,
      (select count(*)::int from activity_log where type = 'login' and created_at > now() - interval '7 days') as logins7,
      (select count(distinct user_id)::int from activity_log where created_at > now() - interval '7 days') as active7,
      (select count(*)::int from activity_log where type = 'chat_query' and created_at > now() - interval '7 days') as chats7,
      (select count(*)::int from analyses) as sims,
      (select count(*)::int from news_articles) as articles,
      (select count(*)::int from chat_conversations) as conversations`))!;

  const daily = await query<{ day: string; n: number }>(
    `select to_char(d, 'MM-DD') as day, coalesce(count(a.id), 0)::int as n
     from generate_series(((now() at time zone 'America/Bogota') - interval '13 days')::date, (now() at time zone 'America/Bogota')::date, interval '1 day') d
     left join activity_log a on (a.created_at at time zone 'America/Bogota')::date = d::date
     group by d order by d`
  );
  const byType = await query<{ type: string; n: number }>(
    `select type, count(*)::int as n from activity_log where created_at > now() - interval '30 days' group by type order by n desc`
  );
  const topAssets = await query<{ symbol: string; n: number }>(
    `select details->>'symbol' as symbol, count(*)::int as n from activity_log
     where type in ('asset_view', 'favorite_add') and details ? 'symbol' group by 1 order by n desc limit 6`
  );
  const sources = await newsSourcesStatus();
  const failing = sources.filter((s) => s.enabled && s.last_status === "error");
  const db = await databaseKind();
  const market = marketProviderStatus();
  const maxDaily = Math.max(1, ...daily.map((d) => d.n));

  const health = [
    { label: "Base de datos", ok: true, text: db === "postgres" ? "PostgreSQL (DATABASE_URL)" : "PGlite local (desarrollo)" },
    { label: "Asistente IA", ok: Boolean(process.env.ANTHROPIC_API_KEY), text: process.env.ANTHROPIC_API_KEY ? `Claude · ${process.env.ANTHROPIC_MODEL || "claude-opus-5-5"}` : "Modo local (sin ANTHROPIC_API_KEY)" },
    { label: "Cotizaciones de acciones", ok: !market.stocks.startsWith("Demo"), text: market.stocks },
    { label: "Cotizaciones cripto", ok: true, text: market.crypto },
    { label: "Correo (recuperación)", ok: Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM), text: process.env.RESEND_API_KEY ? "Resend configurado" : "Sin proveedor: enlaces solo en consola (desarrollo)" },
    { label: "Fuentes de noticias", ok: failing.length === 0, text: `${sources.filter((s) => s.enabled).length} activas · ${failing.length} con error` },
  ];

  return (
    <div>
      <div className="stat-grid">
        <div className="stat"><span>Usuarios registrados</span><strong>{stats.users}</strong><small>{stats.active} activos · {stats.suspended} suspendidos · {stats.admins} admin</small></div>
        <div className="stat"><span>Nuevos (7 días)</span><strong>{stats.new7}</strong><small>{stats.active7} usuarios activos en 7 días</small></div>
        <div className="stat"><span>Inicios de sesión (7 días)</span><strong>{stats.logins7}</strong></div>
        <div className="stat"><span>Consultas al asistente (7 días)</span><strong>{stats.chats7}</strong><small>{stats.conversations} conversaciones totales</small></div>
        <div className="stat"><span>Análisis guardados</span><strong>{stats.sims}</strong></div>
        <div className="stat"><span>Noticias en caché</span><strong>{stats.articles}</strong></div>
      </div>

      <div className="grid-2 section">
        <section className="card">
          <h2 style={{ fontSize: 18 }}>Actividad diaria (14 días)</h2>
          <div className="bars" role="img" aria-label="Número de actividades registradas por día">
            {daily.map((d) => (
              <div key={d.day} title={`${d.day}: ${d.n}`}>
                <span>{d.n || ""}</span>
                <i style={{ height: `${(d.n / maxDaily) * 90}%` }} />
                <span>{d.day.slice(3)}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="card">
          <h2 style={{ fontSize: 18 }}>Estado de la plataforma</h2>
          <table className="table">
            <tbody>
              {health.map((h) => (
                <tr key={h.label}>
                  <td><span className={`status-dot ${h.ok ? "status-ok" : "status-warn"}`} />{h.label}</td>
                  <td className="muted">{h.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <div className="grid-2 section">
        <section className="card">
          <h2 style={{ fontSize: 18 }}>Uso por tipo (30 días)</h2>
          {byType.length === 0 ? <p className="muted">Sin actividad.</p> : (
            <table className="table"><tbody>
              {byType.map((t) => <tr key={t.type}><td>{ACTIVITY_TYPES[t.type as ActivityType] ?? t.type}</td><td className="num">{t.n}</td></tr>)}
            </tbody></table>
          )}
        </section>
        <section className="card">
          <h2 style={{ fontSize: 18 }}>Activos más consultados</h2>
          {topAssets.length === 0 ? <p className="muted">Sin datos todavía.</p> : (
            <table className="table"><tbody>
              {topAssets.map((t) => <tr key={t.symbol}><td><Link href={`/activo/${t.symbol}`}>{t.symbol}</Link></td><td className="num">{t.n}</td></tr>)}
            </tbody></table>
          )}
          {failing.length > 0 && (
            <div className="error">
              Fuentes con error: {failing.map((s) => `${s.name} (${s.last_error ?? "error"}, ${s.last_fetched_at ? timeAgo(s.last_fetched_at) : ""})`).join("; ")}.{" "}
              <Link href="/admin/noticias">Revisar</Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
