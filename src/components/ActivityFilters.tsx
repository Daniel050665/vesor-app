import Link from "next/link";
import { ACTIVITY_TYPES } from "@/lib/activity";
import type { ActivityFilters as Filters } from "@/lib/activity-query";

export default function ActivityFilters({ action, filters, withUser = false }: { action: string; filters: Filters; withUser?: boolean }) {
  return (
    <form action={action} className={`filter-bar ${withUser ? "filter-bar-wide" : ""}`}>
      <div>
        <label htmlFor="tipo">Tipo de actividad</label>
        <select id="tipo" name="tipo" defaultValue={filters.tipo ?? ""}>
          <option value="">Todas</option>
          {Object.entries(ACTIVITY_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="desde">Desde</label>
        <input id="desde" name="desde" type="date" defaultValue={filters.desde} />
      </div>
      <div>
        <label htmlFor="hasta">Hasta</label>
        <input id="hasta" name="hasta" type="date" defaultValue={filters.hasta} />
      </div>
      <div>
        <label htmlFor="q">Buscar</label>
        <input id="q" name="q" defaultValue={filters.q} placeholder="Ej: NVDA" />
      </div>
      {withUser && (
        <div>
          <label htmlFor="usuario">Usuario (correo)</label>
          <input id="usuario" name="usuario" defaultValue={filters.usuario} placeholder="correo" />
        </div>
      )}
      <div className="actions" style={{ marginTop: 0 }}>
        <button className="pill pill-primary">Filtrar</button>
        <Link href={action} className="pill pill-outline">Limpiar</Link>
      </div>
    </form>
  );
}

export function Pager({ action, filters, page, hasMore }: { action: string; filters: Filters; page: number; hasMore: boolean }) {
  const link = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...filters, page: String(p) })) if (v) params.set(k, v);
    return `${action}?${params.toString()}`;
  };
  if (page === 1 && !hasMore) return null;
  return (
    <div className="pager">
      {page > 1 ? <Link className="pill pill-outline" href={link(page - 1)}>← Más recientes</Link> : <span />}
      <span className="muted">Página {page}</span>
      {hasMore ? <Link className="pill pill-outline" href={link(page + 1)}>Anteriores →</Link> : <span />}
    </div>
  );
}
