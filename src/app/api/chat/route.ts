import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { apiUser, jsonError, rateLimit, readJson } from "@/lib/auth";
import { answerChat, type ChatTurn } from "@/lib/chat";
import { logActivity } from "@/lib/activity";

export const maxDuration = 60;

export async function POST(request: Request) {
  const { user, error } = await apiUser(request);
  if (error) return error;
  const body = await readJson(request);
  const message = String(body?.message ?? "").trim();
  if (!message) return jsonError("Escribe una pregunta.", 422);
  if (message.length > 2000) return jsonError("La pregunta es muy larga (máximo 2000 caracteres).", 422);
  if (!rateLimit(`chat:${user.id}`, 30, 10 * 60_000).allowed) {
    return jsonError("Has hecho muchas consultas seguidas. Espera unos minutos.", 429);
  }

  let conversationId = typeof body?.conversationId === "string" ? body.conversationId : null;
  if (conversationId) {
    const owned = await queryOne(`select 1 from chat_conversations where id = $1 and user_id = $2`, [conversationId, user.id]);
    if (!owned) return jsonError("Conversación no encontrada.", 404);
  } else {
    const created = await queryOne<{ id: string }>(
      `insert into chat_conversations (user_id, title) values ($1, $2) returning id`,
      [user.id, message.replace(/\s+/g, " ").slice(0, 70)]
    );
    conversationId = created!.id;
  }

  const history = await query<ChatTurn>(
    `select role, content from chat_messages where conversation_id = $1 order by created_at asc`,
    [conversationId]
  );
  await query(`insert into chat_messages (conversation_id, role, content) values ($1, 'user', $2)`, [conversationId, message]);

  const watchlist = (await query<{ symbol: string }>(`select symbol from watchlist where user_id = $1`, [user.id])).map((w) => w.symbol);
  const answer = await answerChat(user, history, message, watchlist);

  const saved = await queryOne<{ id: string; created_at: string }>(
    `insert into chat_messages (conversation_id, role, content, meta) values ($1, 'assistant', $2, $3::jsonb) returning id, created_at`,
    [conversationId, answer.content, JSON.stringify({ engine: answer.engine, symbols: answer.symbols, sources: answer.sources })]
  );
  await query(`update chat_conversations set updated_at = now() where id = $1`, [conversationId]);

  await logActivity(user.id, "chat_query", message.slice(0, 120), { conversationId, engine: answer.engine, symbols: answer.symbols });
  if (answer.symbols.length) {
    await logActivity(user.id, "analysis", `Análisis de ${answer.symbols.join(", ")}`, {
      conversationId,
      symbols: answer.symbols,
      sources: answer.sources,
      engine: answer.engine,
    });
  }

  return NextResponse.json({
    conversationId,
    message: { id: saved!.id, role: "assistant", content: answer.content, meta: { engine: answer.engine, symbols: answer.symbols, sources: answer.sources }, created_at: saved!.created_at },
  });
}
