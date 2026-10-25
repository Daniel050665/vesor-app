import { query } from "./db";

export const ACTIVITY_TYPES = {
  login: "Inicio de sesión",
  logout: "Cierre de sesión",
  register: "Registro de cuenta",
  password_reset: "Recuperación de contraseña",
  password_change: "Cambio de contraseña",
  profile_update: "Preferencias actualizadas",
  chat_query: "Consulta al asistente",
  analysis: "Análisis financiero",
  simulation: "Simulación de riesgo",
  asset_view: "Activo consultado",
  favorite_add: "Agregado a seguimiento",
  favorite_remove: "Quitado de seguimiento",
  news_open: "Noticia visitada",
  news_save: "Noticia guardada",
  news_unsave: "Noticia eliminada de guardadas",
  admin_action: "Acción administrativa",
} as const;

export type ActivityType = keyof typeof ACTIVITY_TYPES;

/**
 * Registra una actividad. `dedupeWindowMinutes` evita registros duplicados de la misma acción
 * sobre el mismo objetivo dentro de una ventana de tiempo (p. ej. recargar la ficha de un activo).
 */
export async function logActivity(
  userId: string | null,
  type: ActivityType,
  title: string,
  details: Record<string, unknown> = {},
  dedupe?: { target: string; windowMinutes: number }
) {
  let dedupeKey: string | null = null;
  if (dedupe) {
    const bucket = Math.floor(Date.now() / (dedupe.windowMinutes * 60_000));
    dedupeKey = `${userId ?? "anon"}:${type}:${dedupe.target}:${bucket}`;
  }
  try {
    await query(
      `insert into activity_log (user_id, type, title, details, dedupe_key)
       values ($1, $2, $3, $4::jsonb, $5) on conflict (dedupe_key) do nothing`,
      [userId, type, title.slice(0, 200), JSON.stringify(details), dedupeKey]
    );
  } catch (error) {
    // El historial nunca debe romper la acción principal del usuario.
    console.error("[activity] No se pudo registrar la actividad", error);
  }
}
