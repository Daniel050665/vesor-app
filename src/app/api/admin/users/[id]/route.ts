import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { apiAdmin, jsonError, readJson } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { user: admin, error } = await apiAdmin(request);
  if (error) return error;
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return jsonError("Usuario no encontrado.", 404);
  const body = await readJson(request);
  const status = body?.status;
  const role = body?.role;
  if (status !== undefined && status !== "active" && status !== "suspended") return jsonError("Estado no válido.", 422);
  if (role !== undefined && role !== "user" && role !== "admin") return jsonError("Rol no válido.", 422);
  if (params.id === admin.id && (status === "suspended" || role === "user")) {
    return jsonError("No puedes suspender ni quitarte el rol de administrador a ti mismo.", 422);
  }

  const target = await queryOne<{ email: string; role: string; status: string }>(`select email, role, status from app_users where id = $1`, [params.id]);
  if (!target) return jsonError("Usuario no encontrado.", 404);
  if (role === "user" && target.role === "admin") {
    const admins = await queryOne<{ n: number }>(`select count(*)::int as n from app_users where role = 'admin' and status = 'active'`);
    if ((admins?.n ?? 0) <= 1) return jsonError("Debe quedar al menos un administrador activo.", 422);
  }

  await query(
    `update app_users set status = coalesce($2, status), role = coalesce($3, role), updated_at = now() where id = $1`,
    [params.id, status ?? null, role ?? null]
  );
  // Al suspender una cuenta se cierran sus sesiones de inmediato.
  if (status === "suspended") await query(`delete from sessions where user_id = $1`, [params.id]);
  await logActivity(admin.id, "admin_action", `Cuenta ${target.email} actualizada`, {
    targetUserId: params.id,
    antes: { status: target.status, role: target.role },
    cambios: { status, role },
  });
  return NextResponse.json({ ok: true });
}
