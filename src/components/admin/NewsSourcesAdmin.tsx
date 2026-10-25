"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Source = {
  id: number;
  name: string;
  url: string;
  category: string;
  provider: string;
  enabled: boolean;
  last_fetched_at: string | null;
  last_status: string | null;
  last_error: string | null;
  last_count: number;
  articles: number;
};

export default function NewsSourcesAdmin({ sources, categories }: { sources: Source[]; categories: { value: string; label: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState({ name: "", provider: "", url: "", category: categories[0]?.value ?? "mercados" });

  async function call(method: string, body?: unknown) {
    const response = await fetch("/api/admin/news-sources", {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    return { ok: Boolean(response?.ok), payload };
  }

  async function toggle(s: Source) {
    setBusy(`t${s.id}`);
    const { ok, payload } = await call("PATCH", { id: s.id, enabled: !s.enabled });
    setBusy(null);
    if (!ok) setMessage({ ok: false, text: payload.error || "No se pudo actualizar." });
    router.refresh();
  }

  async function refresh() {
    setBusy("refresh");
    setMessage(null);
    const { ok, payload } = await call("PUT");
    setBusy(null);
    setMessage(ok ? { ok: true, text: "Fuentes actualizadas." } : { ok: false, text: payload.error || "No se pudo actualizar." });
    router.refresh();
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy("add");
    setMessage(null);
    const { ok, payload } = await call("POST", form);
    setBusy(null);
    if (!ok) return setMessage({ ok: false, text: payload.error || "No se pudo agregar." });
    setMessage(
      payload.test?.ok
        ? { ok: true, text: `Fuente agregada: ${payload.test.parsed} titulares leídos, ${payload.test.inserted} nuevos.` }
        : { ok: false, text: `La fuente se guardó deshabilitada porque falló la prueba: ${payload.test?.error ?? "error"}` }
    );
    setForm({ ...form, name: "", provider: "", url: "" });
    router.refresh();
  }

  return (
    <div>
      <div className="section-head">
        <p className="muted" style={{ margin: 0 }}>Las fuentes se actualizan automáticamente cada 30 minutos cuando alguien abre las noticias.</p>
        <button className="pill pill-primary" onClick={refresh} disabled={busy !== null}>{busy === "refresh" ? "Actualizando…" : "Actualizar ahora"}</button>
      </div>
      {message && <div className={message.ok ? "info" : "error"} style={{ marginBottom: 12 }}>{message.text}</div>}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>Fuente</th><th>Categoría</th><th>Estado</th><th className="num">Artículos</th><th>Activa</th></tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id}>
                <td><strong>{s.name}</strong><div className="muted small" style={{ maxWidth: 380, overflowWrap: "anywhere" }}>{s.url}</div></td>
                <td>{categories.find((c) => c.value === s.category)?.label ?? s.category}</td>
                <td className="small">
                  <span className={`status-dot ${s.last_status === "ok" ? "status-ok" : s.last_status === "error" ? "status-error" : "status-warn"}`} />
                  {s.last_status === "ok" ? `OK · ${s.last_count} titulares` : s.last_status === "error" ? s.last_error : "Sin consultar"}
                  {s.last_fetched_at && <div className="muted">{new Date(s.last_fetched_at).toLocaleString("es-CO", { timeZone: "America/Bogota" })}</div>}
                </td>
                <td className="num">{s.articles}</td>
                <td>
                  <button className={`pill pill-sm ${s.enabled ? "pill-outline" : "pill-primary"}`} onClick={() => toggle(s)} disabled={busy !== null}>
                    {s.enabled ? "Deshabilitar" : "Habilitar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form className="card section" onSubmit={add}>
        <h2 style={{ fontSize: 18 }}>Agregar fuente RSS</h2>
        <p className="muted small">Usa solo feeds públicos cuyo uso esté autorizado (RSS oficial o API con licencia). Se prueba antes de activarla.</p>
        <div className="row">
          <div><label htmlFor="sname">Nombre</label><input id="sname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Reuters · Mercados" /></div>
          <div><label htmlFor="sprov">Proveedor</label><input id="sprov" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} placeholder="Ej: Reuters" /></div>
        </div>
        <div className="row">
          <div><label htmlFor="surl">URL del feed (HTTPS)</label><input id="surl" type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" /></div>
          <div>
            <label htmlFor="scat">Categoría</label>
            <select id="scat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
        <button className="btn block" disabled={busy !== null}>{busy === "add" ? "Probando fuente…" : "Agregar y probar"}</button>
      </form>
    </div>
  );
}
