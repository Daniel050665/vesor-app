import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { hashPassword, sha256 } from "@/lib/password";
import { isSameOrigin, jsonError, readJson } from "@/lib/auth";
import { validatePassword } from "@/lib/validation";
import { logActivity } from "@/lib/activity";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Origen de la solicitud no permitido.", 403);
  const body = await readJson(request);
  const token = String(body?.token ?? "");
  const password = String(body?.password ?? "");
  if (!token) return jsonError("El enlace no es válido.", 400);
  const problem = validatePassword(password);
  if (problem) return jsonError(problem, 422);
  if (body?.password_confirm !== password) return jsonError("Las contraseñas no coinciden.", 422);

  const reset = await queryOne<{ user_id: string }>(
    `update password_resets set used_at = now()
     where token_hash = $1 and used_at is null and expires_at > now() returning user_id`,
    [sha256(token)]
  );
  if (!reset) return jsonError("El enlace venció o ya fue usado. Solicita uno nuevo.", 400);

  await query(`update app_users set password_hash = $2, updated_at = now() where id = $1`, [reset.user_id, await hashPassword(password)]);
  // Cierra todas las sesiones abiertas con la contraseña anterior.
  await query(`delete from sessions where user_id = $1`, [reset.user_id]);
  await logActivity(reset.user_id, "password_reset", "Contraseña restablecida con enlace de recuperación");
  return NextResponse.json({ ok: true });
}
