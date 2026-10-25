import { query } from "./db";
import { ACTIVITY_TYPES } from "./activity";
import type { ActivityRow } from "@/components/ActivityTimeline";

export type ActivityFilters = { tipo?: string; desde?: string; hasta?: string; q?: string; page?: string; usuario?: string };

export const PAGE_SIZE = 30;

/**
 * Consulta del historial con filtros. Si `userId` está definido, solo devuelve actividades de ese usuario
 * (la restricción se aplica en SQL, no en la interfaz).
 */
export async function queryActivity(filters: ActivityFilters, userId: string | null) {
  const params: unknown[] = [];
  const where: string[] = [];
  if (userId) {
    params.push(userId);
    where.push(`a.user_id = $${params.length}`);
  }
  if (filters.tipo && filters.tipo in ACTIVITY_TYPES) {
    params.push(filters.tipo);
    where.push(`a.type = $${params.length}`);
  }
  if (filters.desde && /^\d{4}-\d{2}-\d{2}$/.test(filters.desde)) {
    params.push(`${filters.desde}T00:00:00-05:00`);
    where.push(`a.created_at >= $${params.length}`);
  }
  if (filters.hasta && /^\d{4}-\d{2}-\d{2}$/.test(filters.hasta)) {
    params.push(`${filters.hasta}T23:59:59.999-05:00`);
    where.push(`a.created_at <= $${params.length}`);
  }
  if (filters.q?.trim()) {
    params.push(`%${filters.q.trim().toLowerCase().slice(0, 80)}%`);
    where.push(`lower(a.title) like $${params.length}`);
  }
  if (filters.usuario?.trim()) {
    params.push(`%${filters.usuario.trim().toLowerCase().slice(0, 80)}%`);
    where.push(`lower(u.email) like $${params.length}`);
  }
  const page = Math.max(1, Number(filters.page) || 1);
  const whereSql = where.length ? `where ${where.join(" and ")}` : "";
  const rows = await query<ActivityRow>(
    `select a.id, a.type, a.title, a.details, a.created_at, u.email
     from activity_log a left join app_users u on u.id = a.user_id
     ${whereSql}
     order by a.created_at desc
     limit ${PAGE_SIZE + 1} offset ${(page - 1) * PAGE_SIZE}`,
    params
  );
  return { rows: rows.slice(0, PAGE_SIZE), page, hasMore: rows.length > PAGE_SIZE };
}
