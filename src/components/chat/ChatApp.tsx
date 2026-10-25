"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import RichText from "./RichText";

type Conversation = { id: string; title: string; updated_at: string; messages: number };
type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: { engine?: string; symbols?: string[]; sources?: string[] };
};

const SUGGESTIONS: Record<string, string[]> = {
  principiante: ["¿Qué es un ETF y por qué diversifica?", "¿Qué es la volatilidad?", "Analiza SPY", "¿Qué podría investigar según mis intereses?"],
  intermedio: ["Compara SPY con QQQ", "¿Cómo va Bitcoin?", "¿Qué indica el RSI de NVDA?", "¿Qué podría investigar según mis intereses?"],
  avanzado: ["Compara NVDA, AMD y TSM", "Volatilidad y caída máxima de ETH vs BTC", "Analiza XLE frente a ICLN", "Ideas según mi perfil"],
};

export default function ChatApp({ initialConversations, level, aiEnabled, initialQuestion, initialConversationId }: {
  initialConversations: Conversation[];
  level: string;
  aiEnabled: boolean;
  initialQuestion?: string;
  initialConversationId?: string;
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState(initialQuestion ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const refreshList = useCallback(async () => {
    const response = await fetch("/api/chat/conversations").catch(() => null);
    if (response?.ok) setConversations((await response.json()).conversations);
  }, []);

  async function open(id: string) {
    setError(null);
    setActiveId(id);
    setMessages([]);
    const response = await fetch(`/api/chat/conversations/${id}`).catch(() => null);
    if (!response?.ok) return setError("No pudimos abrir la conversación.");
    setMessages((await response.json()).messages);
  }

  useEffect(() => {
    if (initialConversationId) open(initialConversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConversationId]);

  async function remove(id: string) {
    if (!window.confirm("¿Eliminar esta conversación de tu historial?")) return;
    const response = await fetch(`/api/chat/conversations/${id}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) return setError("No pudimos eliminar la conversación.");
    if (id === activeId) newChat();
    setConversations((list) => list.filter((c) => c.id !== id));
  }

  function newChat() {
    setActiveId(null);
    setMessages([]);
    setError(null);
    inputRef.current?.focus();
  }

  async function send(question?: string) {
    const message = (question ?? text).trim();
    if (!message || busy) return;
    setError(null);
    setBusy(true);
    setText("");
    setMessages((m) => [...m, { id: `tmp-${Date.now()}`, role: "user", content: message }]);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId: activeId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No pudimos responder.");
      setActiveId(payload.conversationId);
      setMessages((m) => [...m, payload.message]);
      refreshList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión.");
      setText(message);
    }
    setBusy(false);
    inputRef.current?.focus();
  }

  return (
    <div className="chat-layout">
      <aside className="chat-side" aria-label="Conversaciones anteriores">
        <button className="pill pill-primary" onClick={newChat}>+ Nueva conversación</button>
        <div className="chat-convs">
          {conversations.length === 0 && <p className="muted small">Tus conversaciones aparecerán aquí.</p>}
          {conversations.map((c) => (
            <div key={c.id} className={`chat-conv ${c.id === activeId ? "active" : ""}`}>
              <button className="open" onClick={() => open(c.id)} title={c.title}>{c.title}</button>
              <button className="del" onClick={() => remove(c.id)} aria-label={`Eliminar conversación ${c.title}`}>×</button>
            </div>
          ))}
        </div>
      </aside>

      <section className="chat-main">
        <div className="chat-log" ref={logRef} aria-live="polite">
          {messages.length === 0 && (
            <div>
              <p className="muted">
                Pregunta por acciones, ETF o criptomonedas del catálogo, pide comparaciones o la explicación de un concepto. Las respuestas se adaptan a tu nivel
                ({level}) e indican si los datos son reales o simulados.
              </p>
              {!aiEnabled && (
                <p className="demo-note" style={{ marginBottom: 12 }}>Modo local: configura ANTHROPIC_API_KEY para respuestas con IA generativa.</p>
              )}
              <div className="suggestions">
                {(SUGGESTIONS[level] ?? SUGGESTIONS.principiante).map((s) => (
                  <button key={s} className="toggle" onClick={() => send(s)} disabled={busy}>{s}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="msg-user">{m.content}</div>
            ) : (
              <div key={m.id} className="msg-bot">
                <RichText text={m.content} />
                <div className="msg-meta">
                  <span className={m.meta?.engine === "claude" ? "real-note" : "chip"}>{m.meta?.engine === "claude" ? "IA (Claude)" : "Modo local"}</span>
                  {m.meta?.sources?.map((s) => (
                    <span key={s} className={s === "Demo" ? "demo-note" : "real-note"}>{s === "Demo" ? "Datos simulados" : `Datos: ${s}`}</span>
                  ))}
                </div>
              </div>
            )
          )}
          {busy && <p className="typing">Analizando</p>}
          {error && <div className="error" role="alert">{error}</div>}
        </div>
        <form className="chat-form" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <textarea
            ref={inputRef}
            rows={1}
            value={text}
            maxLength={2000}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Escribe tu pregunta… (Enter para enviar)"
            aria-label="Pregunta para el asistente"
          />
          <button className="pill pill-primary" disabled={busy || !text.trim()}>Enviar</button>
        </form>
        <p className="disclaimer" style={{ marginTop: 8 }}>
          Análisis educativo: no garantiza rendimientos ni sustituye tu evaluación personal del riesgo.
        </p>
      </section>
    </div>
  );
}
