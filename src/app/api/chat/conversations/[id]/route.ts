import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { apiUser, jsonError } from "@/lib/auth";

const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { user, error } = await apiUser(request);
  if (error) return error;
  if (!UUID_RE.test(params.id)) return jsonError("Conversación no encontrada.", 404);
  const conversation = await queryOne(`select id, title from chat_conversations where id = $1 and user_id = $2`, [params.id, user.id]);
  if (!conversation) return jsonError("Conversación no encontrada.", 404);
  const messages = await query(
    `select id, role, content, meta, created_at from chat_messages where conversation_id = $1 order by created_at asc`,
    [params.id]
  );
  return NextResponse.json({ conversation, messages });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { user, error } = await apiUser(request);
  if (error) return error;
  if (!UUID_RE.test(params.id)) return jsonError("Conversación no encontrada.", 404);
  const rows = await query(`delete from chat_conversations where id = $1 and user_id = $2 returning id`, [params.id, user.id]);
  if (!rows.length) return jsonError("Conversación no encontrada.", 404);
  return NextResponse.json({ ok: true });
}
