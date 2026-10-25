import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { apiUser } from "@/lib/auth";

export async function GET(request: Request) {
  const { user, error } = await apiUser(request);
  if (error) return error;
  const conversations = await query(
    `select c.id, c.title, c.updated_at, (select count(*)::int from chat_messages m where m.conversation_id = c.id) as messages
     from chat_conversations c where c.user_id = $1 order by c.updated_at desc limit 50`,
    [user.id]
  );
  return NextResponse.json({ conversations });
}
