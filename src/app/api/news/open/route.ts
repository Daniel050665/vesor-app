import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

// Registra la visita (si hay sesión) y redirige a la publicación original.
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.redirect(new URL("/noticias", request.url));
  const article = await queryOne<{ url: string; title: string; source_name: string }>(
    `select url, title, source_name from news_articles where id = $1`,
    [id]
  );
  if (!article || !/^https?:\/\//.test(article.url)) return NextResponse.redirect(new URL("/noticias", request.url));
  const user = await getCurrentUser();
  if (user) {
    await logActivity(user.id, "news_open", article.title, { articleId: id, source: article.source_name, url: article.url }, { target: id, windowMinutes: 30 });
  }
  return NextResponse.redirect(article.url);
}
