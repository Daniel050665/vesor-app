import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { queryActivity, type ActivityFilters as Filters } from "@/lib/activity-query";
import ActivityTimeline from "@/components/ActivityTimeline";
import ActivityFilters, { Pager } from "@/components/ActivityFilters";
import type { Nivel } from "@/lib/types";
import { dateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Historial — Vesor" };

export default async function HistorialPage({ searchParams }: { searchParams: Filters }) {
  const user = await requireUser("/historial");
  const { rows, page, hasMore } = await queryActivity(searchParams, user.id);
  const analyses = await query<{ id: string; created_at: string; nombre: string; nivel: Nivel; kind: string }>(
    `select id, created_at, nombre, nivel, kind from analyses where user_id = $1 order by created_at desc limit 6`,
    [user.id]
  );

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="eyebrow">Historial</p>
          <h1>Tu actividad</h1>
          <p className="muted">Sesiones, consultas al asistente, análisis, activos y noticias. Solo tú puedes ver este historial.</p>
        </div>
      </div>

      {analyses.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div className="section-head"><h2>Análisis guardados</h2></div>
          <div className="grid-3">
            {analyses.map((a) => (
              <Link key={a.id} href={`/resultado/${a.id}`} className="list-item" style={{ marginBottom: 0 }}>
                <div>
                  <strong>{a.nombre}</strong>
                  <div className="muted small">{a.kind === "riesgo_ia" ? "Evaluación con IA" : "Simulación de riesgo"} · {dateTime(a.created_at)}</div>
                </div>
                <span className={`badge ${a.nivel}`}>{a.nivel}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <ActivityFilters action="/historial" filters={searchParams} />
      <ActivityTimeline rows={rows} />
      <Pager action="/historial" filters={searchParams} page={page} hasMore={hasMore} />
    </div>
  );
}
