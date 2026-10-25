import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { query, queryOne } from "./db";
import { randomToken, sha256 } from "./password";

export const SESSION_COOKIE = "vesor_session";
const SESSION_DAYS = 7;

export type Role = "user" | "admin";

export type SessionUser = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  status: "active" | "suspended";
  experience: "principiante" | "intermedio" | "avanzado";
  interests: string[];
  goal: string | null;
  horizon: string | null;
  risk_tolerance: "baja" | "media" | "alta" | null;
  created_at: string;
  last_login_at: string | null;
};

const USER_COLUMNS = `u.id, u.email, u.full_name, u.role, u.status, u.experience, u.interests, u.goal, u.horizon,
  u.risk_tolerance, u.created_at, u.last_login_at`;

function clientInfo() {
  const h = headers();
  const ip = (h.get("x-forwarded-for") || h.get("x-real-ip") || "local").split(",")[0].trim();
  return { ip, userAgent: (h.get("user-agent") || "").slice(0, 300) };
}

export async function createSession(userId: string) {
  const token = randomToken();
  const { ip, userAgent } = clientInfo();
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await query(
    `insert into sessions (token_hash, user_id, expires_at, ip, user_agent) values ($1, $2, $3, $4, $5)`,
    [sha256(token), userId, expires.toISOString(), ip, userAgent]
  );
  await query(`update app_users set last_login_at = now() where id = $1`, [userId]);
  // Limpieza oportunista de sesiones vencidas.
  await query(`delete from sessions where expires_at < now()`);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function destroySession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) await query(`delete from sessions where token_hash = $1`, [sha256(token)]);
  cookies().delete(SESSION_COOKIE);
}

/** Usuario de la sesión actual, validado contra la base de datos (estado activo y sesión vigente). */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const user = await queryOne<SessionUser>(
    `select ${USER_COLUMNS} from sessions s join app_users u on u.id = s.user_id
     where s.token_hash = $1 and s.expires_at > now() and u.status = 'active'`,
    [sha256(token)]
  );
  return user;
}

export async function requireUser(next?: string) {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser("/admin");
  if (user.role !== "admin") redirect("/panel?denegado=1");
  return user;
}

export function jsonError(message: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/** Protección CSRF básica: las peticiones que modifican datos deben venir del mismo origen. */
export function isSameOrigin(request: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

type Guarded = { user: SessionUser; error?: undefined } | { user?: undefined; error: NextResponse };

export async function apiUser(request: Request): Promise<Guarded> {
  if (!isSameOrigin(request)) return { error: jsonError("Origen de la solicitud no permitido.", 403) };
  const user = await getCurrentUser();
  if (!user) return { error: jsonError("Tu sesión expiró. Inicia sesión de nuevo.", 401) };
  return { user };
}

export async function apiAdmin(request: Request): Promise<Guarded> {
  const result = await apiUser(request);
  if (result.error) return result;
  if (result.user.role !== "admin") return { error: jsonError("No tienes permisos de administrador.", 403) };
  return result;
}

// Límite de intentos en memoria (por instancia). Suficiente para frenar fuerza bruta básica.
const attempts = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }
  entry.count++;
  if (entry.count > max) return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  return { allowed: true, retryAfterSec: 0 };
}

export function clearRateLimit(key: string) {
  attempts.delete(key);
}

export function requestIp() {
  return clientInfo().ip;
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
