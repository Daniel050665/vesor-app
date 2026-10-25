import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { apiAdmin, jsonError, readJson } from "@/lib/auth";
import { NEWS_CATEGORIES, fetchSource, refreshNews, type NewsSource } from "@/lib/news";
import { logActivity } from "@/lib/activity";

// Alta de una fuente RSS. Se prueba antes de guardarla para no dejar fuentes rotas activas.
export async function POST(request: Request) {
  const { user, error } = await apiAdmin(request);
  if (error) return error;
  const body = await readJson(request);
  const name = String(body?.name ?? "").trim().slice(0, 80);
  const provider = String(body?.provider ?? "").trim().slice(0, 60);
  const category = String(body?.category ?? "");
  const url = String(body?.url ?? "").trim();
  if (name.length < 3 || provider.length < 2) return jsonError("Escribe el nombre de la fuente y del proveedor.", 422);
  if (!NEWS_CATEGORIES.some((c) => c.value === category)) return jsonError("Categoría no válida.", 422);
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return jsonError("La URL del feed no es válida.", 422);
  }
  if (parsed.protocol !== "https:") return jsonError("Solo se permiten feeds HTTPS.", 422);
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[?::1)/.test(parsed.hostname)) return jsonError("Dirección no permitida.", 422);

  const source = await queryOne<NewsSource>(
    `insert into news_sources (name, url, category, provider) values ($1, $2, $3, $4) on conflict (url) do nothing returning *`,
    [name, parsed.toString(), category, provider]
  );
  if (!source) return jsonError("Esa fuente ya existe.", 409);
  const test = await fetchSource(source);
  if (!test.ok) await query(`update news_sources set enabled = false where id = $1`, [source.id]);
  await logActivity(user.id, "admin_action", `Fuente de noticias agregada: ${name}`, { url: parsed.toString(), resultado: test });
  return NextResponse.json({ ok: true, test });
}

export async function PATCH(request: Request) {
  const { user, error } = await apiAdmin(request);
  if (error) return error;
  const body = await readJson(request);
  const id = Number(body?.id);
  if (!Number.isInteger(id) || typeof body?.enabled !== "boolean") return jsonError("Solicitud inválida.", 422);
  const rows = await query<{ name: string }>(`update news_sources set enabled = $2 where id = $1 returning name`, [id, body.enabled]);
  if (!rows.length) return jsonError("Fuente no encontrada.", 404);
  await logActivity(user.id, "admin_action", `Fuente ${rows[0].name} ${body.enabled ? "habilitada" : "deshabilitada"}`, { sourceId: id });
  return NextResponse.json({ ok: true });
}

// Fuerza la actualización de todas las fuentes habilitadas.
export async function PUT(request: Request) {
  const { user, error } = await apiAdmin(request);
  if (error) return error;
  await refreshNews(true);
  await logActivity(user.id, "admin_action", "Actualización manual de noticias");
  const sources = await query(`select id, name, last_status, last_error, last_count from news_sources order by id`);
  return NextResponse.json({ ok: true, sources });
}
