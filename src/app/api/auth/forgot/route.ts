import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/password";
import { isSameOrigin, jsonError, rateLimit, readJson, requestIp } from "@/lib/auth";
import { normalizeEmail, validateEmail } from "@/lib/validation";
import { sendMail } from "@/lib/mailer";

const GENERIC = "Si el correo está registrado, enviaremos un enlace para restablecer la contraseña. Revisa tu bandeja de entrada.";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Origen de la solicitud no permitido.", 403);
  const body = await readJson(request);
  const email = normalizeEmail(body?.email);
  const emailError = validateEmail(email);
  if (emailError) return jsonError(emailError, 422);
  if (!rateLimit(`forgot:${requestIp()}`, 5, 15 * 60_000).allowed) {
    return jsonError("Demasiadas solicitudes. Intenta en unos minutos.", 429);
  }

  const user = await queryOne<{ id: string; status: string }>(`select id, status from app_users where email = $1`, [email]);
  let devResetUrl: string | undefined;
  if (user && user.status === "active") {
    const token = randomToken();
    await query(`delete from password_resets where user_id = $1 and used_at is null`, [user.id]);
    await query(
      `insert into password_resets (token_hash, user_id, expires_at) values ($1, $2, now() + interval '30 minutes')`,
      [sha256(token), user.id]
    );
    const origin = process.env.APP_URL || new URL(request.url).origin;
    const url = `${origin}/restablecer?token=${encodeURIComponent(token)}`;
    const result = await sendMail(
      email,
      "Restablece tu contraseña de Vesor",
      `Recibimos una solicitud para restablecer tu contraseña.\n\nAbre este enlace (válido por 30 minutos):\n${url}\n\nSi no fuiste tú, ignora este mensaje.`
    );
    // Solo en desarrollo y sin proveedor de correo: se devuelve el enlace para poder probar el flujo.
    if (result.dev) devResetUrl = url;
  }
  return NextResponse.json({ ok: true, message: GENERIC, ...(devResetUrl ? { devResetUrl } : {}) });
}
