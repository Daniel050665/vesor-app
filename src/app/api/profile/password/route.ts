import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query, queryOne } from "@/lib/db";
import { apiUser, jsonError, rateLimit, readJson, SESSION_COOKIE } from "@/lib/auth";
import { hashPassword, sha256, verifyPassword } from "@/lib/password";
import { validatePassword } from "@/lib/validation";
import { logActivity } from "@/lib/activity";

export async function POST(request: Request) {
  const { user, error } = await apiUser(request);
  if (error) return error;
  if (!rateLimit(`pwchange:${user.id}`, 5, 15 * 60_000).allowed) return jsonError("Demasiados intentos. Espera unos minutos.", 429);
  const body = await readJson(request);
  const current = String(body?.current_password ?? "");
  const next = String(body?.new_password ?? "");
  const problem = validatePassword(next);
  if (problem) return jsonError(problem, 422);
  if (body?.new_password_confirm !== next) return jsonError("Las contraseñas nuevas no coinciden.", 422);

  const row = await queryOne<{ password_hash: string }>(`select password_hash from app_users where id = $1`, [user.id]);
  if (!row || !(await verifyPassword(current, row.password_hash))) return jsonError("La contraseña actual no es correcta.", 401);

  await query(`update app_users set password_hash = $2, updated_at = now() where id = $1`, [user.id, await hashPassword(next)]);
  // Se cierran las demás sesiones abiertas y se conserva la actual.
  const token = cookies().get(SESSION_COOKIE)?.value ?? "";
  await query(`delete from sessions where user_id = $1 and token_hash <> $2`, [user.id, sha256(token)]);
  await logActivity(user.id, "password_change", "Contraseña actualizada desde el perfil");
  return NextResponse.json({ ok: true });
}
