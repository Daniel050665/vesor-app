import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createSession, isSameOrigin, jsonError, rateLimit, readJson, requestIp } from "@/lib/auth";
import { validateRegister } from "@/lib/validation";
import { logActivity } from "@/lib/activity";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Origen de la solicitud no permitido.", 403);
  const limit = rateLimit(`register:${requestIp()}`, 10, 60 * 60_000);
  if (!limit.allowed) return jsonError("Demasiados registros desde esta conexión. Intenta más tarde.", 429);

  const body = await readJson(request);
  if (!body) return jsonError("Solicitud inválida.", 400);
  const v = validateRegister(body);
  if (!v.ok) return jsonError("Revisa los campos marcados.", 422, { fields: v.errors });

  const duplicate = { fields: { email: "Este correo ya está registrado." } };
  const exists = await queryOne(`select 1 from app_users where email = $1`, [v.data.email]);
  if (exists) return jsonError("Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.", 409, duplicate);

  const d = v.data;
  let user: { id: string } | null;
  try {
    user = await queryOne<{ id: string }>(
      `insert into app_users (email, password_hash, full_name, birth_date, experience, interests, goal, horizon, risk_tolerance)
       values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9) returning id`,
      [d.email, await hashPassword(d.password), d.full_name, d.birth_date, d.experience, JSON.stringify(d.interests), d.goal, d.horizon, d.risk_tolerance]
    );
  } catch {
    // Dos registros simultáneos: la restricción unique de la base de datos evita el duplicado.
    return jsonError("Ya existe una cuenta con ese correo.", 409, duplicate);
  }
  if (!user) return jsonError("No pudimos crear la cuenta.", 500);

  await logActivity(user.id, "register", "Cuenta creada", { interests: d.interests, experience: d.experience });
  await createSession(user.id);
  await logActivity(user.id, "login", "Inicio de sesión tras el registro");
  return NextResponse.json({ ok: true, redirect: "/panel" });
}
