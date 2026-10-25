import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { apiUser, jsonError, readJson } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

async function articleFrom(request: Request) {
  const body = await readJson(request);
  const id = String(body?.articleId ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return queryOne<{ id: string; title: string; source_name: string }>(`select id, title, source_name from news_articles where id = $1`, [id]);
}

export async function POST(request: Request) {
  const { user, error } = await apiUser(request);
  if (error) return error;
  const article = await articleFrom(request);
  if (!article) return jsonError("Noticia no encontrada.", 404);
  const rows = await query(`insert into saved_news (user_id, article_id) values ($1, $2) on conflict do nothing returning article_id`, [user.id, article.id]);
  if (rows.length) await logActivity(user.id, "news_save", article.title, { articleId: article.id, source: article.source_name });
  return NextResponse.json({ ok: true, saved: true });
}

export async function DELETE(request: Request) {
  const { user, error } = await apiUser(request);
  if (error) return error;
  const article = await articleFrom(request);
  if (!article) return jsonError("Noticia no encontrada.", 404);
  const rows = await query(`delete from saved_news where user_id = $1 and article_id = $2 returning article_id`, [user.id, article.id]);
  if (rows.length) await logActivity(user.id, "news_unsave", article.title, { articleId: article.id });
  return NextResponse.json({ ok: true, saved: false });
}
