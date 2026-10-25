"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PreferenceFields, { type PreferenceValues } from "./auth/PreferenceFields";
import { validatePassword, validatePreferences } from "@/lib/validation";

export function PreferencesForm({ initialName, initial }: { initialName: string; initial: PreferenceValues }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [prefs, setPrefs] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    const v = validatePreferences(prefs);
    if (!v.ok) {
      setErrors(v.errors);
      return setStatus({ ok: false, text: "Revisa los campos marcados." });
    }
    setBusy(true);
    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: name, ...prefs }),
    }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    setBusy(false);
    if (!response?.ok) {
      setErrors(payload.fields ?? {});
      return setStatus({ ok: false, text: payload.error || "No se pudo guardar." });
    }
    setErrors({});
    setStatus({ ok: true, text: "Preferencias guardadas. Tu panel, noticias y recomendaciones ya usan los cambios." });
    router.refresh();
  }

  return (
    <form onSubmit={save} noValidate className="card">
      <h2>Preferencias de inversión</h2>
      <label htmlFor="full_name">Nombre completo</label>
      <input id="full_name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
      {errors.full_name && <div className="field-error">{errors.full_name}</div>}
      <PreferenceFields values={prefs} onChange={setPrefs} errors={errors} />
      {status && <div className={status.ok ? "info" : "error"} role="status">{status.text}</div>}
      <button className="btn block" disabled={busy}>{busy ? "Guardando…" : "Guardar preferencias"}</button>
    </form>
  );
}

export function PasswordForm() {
  const [form, setForm] = useState({ current_password: "", new_password: "", new_password_confirm: "" });
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const problem = validatePassword(form.new_password);
    if (problem) return setStatus({ ok: false, text: problem });
    if (form.new_password !== form.new_password_confirm) return setStatus({ ok: false, text: "Las contraseñas nuevas no coinciden." });
    setBusy(true);
    const response = await fetch("/api/profile/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    setBusy(false);
    if (!response?.ok) return setStatus({ ok: false, text: payload.error || "No se pudo cambiar la contraseña." });
    setForm({ current_password: "", new_password: "", new_password_confirm: "" });
    setStatus({ ok: true, text: "Contraseña actualizada. Cerramos tus otras sesiones abiertas." });
  }

  const field = (key: keyof typeof form, label: string, autoComplete: string) => (
    <>
      <label htmlFor={key}>{label}</label>
      <input id={key} type="password" autoComplete={autoComplete} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </>
  );

  return (
    <form onSubmit={save} noValidate className="card">
      <h2>Cambiar contraseña</h2>
      {field("current_password", "Contraseña actual", "current-password")}
      {field("new_password", "Contraseña nueva", "new-password")}
      <p className="field-hint">Mínimo 10 caracteres con mayúscula, minúscula, número y símbolo.</p>
      {field("new_password_confirm", "Confirmar contraseña nueva", "new-password")}
      {status && <div className={status.ok ? "info" : "error"} role="status">{status.text}</div>}
      <button className="btn block" disabled={busy}>{busy ? "Actualizando…" : "Actualizar contraseña"}</button>
    </form>
  );
}
