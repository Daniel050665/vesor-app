import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import ChatApp from "@/components/chat/ChatApp";

export const dynamic = "force-dynamic";
export const metadata = { title: "Asistente IA — Vesor" };

export default async function ChatPage({ searchParams }: { searchParams: { q?: string; c?: string } }) {
  const user = await requireUser("/chat");
  const conversations = await query<{ id: string; title: string; updated_at: string; messages: number }>(
    `select c.id, c.title, c.updated_at, (select count(*)::int from chat_messages m where m.conversation_id = c.id) as messages
     from chat_conversations c where c.user_id = $1 order by c.updated_at desc limit 50`,
    [user.id]
  );
  return (
    <div>
      <div className="page-head" style={{ marginBottom: 16 }}>
        <div>
          <p className="eyebrow">Asistente de análisis financiero</p>
          <h1>Pregunta antes de invertir</h1>
        </div>
      </div>
      <ChatApp
        initialConversations={conversations.map((c) => ({ ...c, updated_at: String(c.updated_at) }))}
        level={user.experience}
        aiEnabled={Boolean(process.env.ANTHROPIC_API_KEY)}
        initialQuestion={searchParams.q?.slice(0, 500)}
        initialConversationId={searchParams.c && /^[0-9a-f-]{36}$/i.test(searchParams.c) ? searchParams.c : undefined}
      />
    </div>
  );
}
