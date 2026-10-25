import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { clearRateLimit, createSession, isSameOrigin, jsonError, rateLimit, readJson, requestIp } from "@/lib/auth";
import { normalizeEmail } from "@/lib/validation";
import { logActivity } from "@/lib/activity";

// Hash ficticio para que el tiempo de respuesta no revele si el correo existe.
let dummyHash: Promise<string> | null = null;

function safeNext(next: unknown) {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : null;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Origen de la solicitud no permitido.", 403);
  const body = await readJson(request);
  if (!body) return jsonError("Solicitud inválida.", 400);
  const email = normalizeEmail(body.email);
  const password = String(body.password ?? "");
  if (!email || !password) return jsonError("Escribe tu correo y tu contraseña.", 422);

  const key = `login:${requestIp()}:${email}`;
  const limit = rateLimit(key, 5, 15 * 60_000);
  if (!limit.allowed) {
    return jsonError(`Demasiados intentos. Espera ${Math.ceil(limit.retryAfterSec / 60)} minuto(s) e inténtalo de nuevo.`, 429);
  }

  const user = await queryOne<{ id: string; password_hash: string; status: string; role: string }>(
    `select id, password_hash, status, role from app_users where email = $1`,
    [email]
  );
  dummyHash ??= hashPassword("contraseña-ficticia-para-tiempo-constante");
  const valid = await verifyPassword(password, user?.password_hash ?? (await dummyHash));
  if (!user || !valid) return jsonError("Correo o contraseña incorrectos.", 401);
  if (user.status !== "active") {
    return jsonError("Tu cuenta está suspendida. Escribe al equipo de Vesor para más información.", 403);
  }

  clearRateLimit(key);
  await createSession(user.id);
  await logActivity(user.id, "login", "Inicio de sesión");
  const fallback = user.role === "admin" ? "/admin" : "/panel";
  return NextResponse.json({ ok: true, redirect: safeNext(body.next) ?? fallback });
}
