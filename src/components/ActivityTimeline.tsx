import Link from "next/link";
import { ACTIVITY_TYPES, type ActivityType } from "@/lib/activity";
import { dateOnly, dayKey } from "@/lib/format";

export type ActivityRow = {
  id: string;
  type: ActivityType;
  title: string;
  details: Record<string, unknown>;
  created_at: string;
  email?: string | null;
};

const LABELS: Record<string, string> = {
  symbol: "Activo",
  symbols: "Activos",
  engine: "Motor",
  sources: "Fuentes de datos",
  source: "Fuente",
  fuente: "Fuente",
  meanRisk: "Riesgo estimado (%)",
  nivel: "Nivel",
  datos: "Datos",
  interests: "Intereses",
  experience: "Experiencia",
  antes: "Antes",
  despues: "Después",
  cambios: "Cambios",
  url: "Enlace",
};

function display(value: unknown): string {
  if (Array.isArray(value)) return value.map(display).join(", ");
  if (value && typeof value === "object") return Object.entries(value).map(([k, v]) => `${k}: ${display(v)}`).join(" · ");
  if (value === "claude") return "IA (Claude)";
  if (value === "local") return "Modo local";
  return String(value ?? "—");
}

function links(d: Record<string, unknown>, ownView: boolean) {
  const out: { href: string; label: string; external?: boolean }[] = [];
  // Los análisis y conversaciones son privados: solo se enlazan en el historial de su dueño.
  if (ownView && typeof d.analysisId === "string") out.push({ href: `/resultado/${d.analysisId}`, label: "Ver análisis" });
  if (ownView && typeof d.conversationId === "string") out.push({ href: `/chat?c=${d.conversationId}`, label: "Abrir conversación" });
  if (typeof d.symbol === "string") out.push({ href: `/activo/${d.symbol}`, label: `Ver ${d.symbol}` });
  if (typeof d.articleId === "string") out.push({ href: `/api/news/open?id=${d.articleId}`, label: "Abrir noticia", external: true });
  return out;
}

const HIDDEN = new Set(["analysisId", "conversationId", "articleId", "targetUserId", "sourceId", "resultado"]);

export default function ActivityTimeline({ rows, showUser = false }: { rows: ActivityRow[]; showUser?: boolean }) {
  if (!rows.length) return <div className="empty">No hay actividades con estos filtros.</div>;
  const items: React.ReactNode[] = [];
  let lastDay = "";
  for (const row of rows) {
    const day = dayKey(row.created_at);
    if (day !== lastDay) {
      items.push(<div key={`d-${day}`} className="timeline-day">{dateOnly(row.created_at)}</div>);
      lastDay = day;
    }
    const details = Object.entries(row.details ?? {}).filter(([k]) => !HIDDEN.has(k));
    const rowLinks = links(row.details ?? {}, !showUser);
    items.push(
      <div key={row.id} className={`tl-item t-${row.type}`}>
        <details>
          <summary>
            <span className="chip">{ACTIVITY_TYPES[row.type] ?? row.type}</span>
            <span className="tl-title">{row.title}</span>
            <span className="tl-time">
              {new Date(row.created_at).toLocaleTimeString("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit" })}
              {showUser && row.email ? ` · ${row.email}` : ""}
            </span>
          </summary>
          <div className="tl-details">
            <dl>
              <dt>Fecha</dt>
              <dd>{new Date(row.created_at).toLocaleString("es-CO", { timeZone: "America/Bogota" })}</dd>
              {showUser && <><dt>Usuario</dt><dd>{row.email ?? "—"}</dd></>}
              {details.map(([k, v]) => (
                <Fragment2 key={k} label={LABELS[k] ?? k} value={display(v)} />
              ))}
            </dl>
            {rowLinks.length > 0 && (
              <div className="actions" style={{ marginTop: 10 }}>
                {rowLinks.map((l) =>
                  l.external ? (
                    <a key={l.href} href={l.href} className="pill pill-outline pill-sm" target="_blank" rel="noopener noreferrer">{l.label} ↗</a>
                  ) : (
                    <Link key={l.href} href={l.href} className="pill pill-outline pill-sm">{l.label}</Link>
                  )
                )}
              </div>
            )}
          </div>
        </details>
      </div>
    );
  }
  return <div className="timeline">{items}</div>;
}

function Fragment2({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}
