"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { passwordProblems, validateRegister } from "@/lib/validation";
import PreferenceFields, { type PreferenceValues } from "./PreferenceFields";

const RULES = [
  ["al menos 10 caracteres", "10+ caracteres"],
  ["una minúscula", "minúscula"],
  ["una mayúscula", "mayúscula"],
  ["un número", "número"],
  ["un símbolo", "símbolo"],
] as const;

export default function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", password_confirm: "", birth_date: "", accept_terms: false });
  const [prefs, setPrefs] = useState<PreferenceValues>({ experience: "", interests: [], goal: "", horizon: "", risk_tolerance: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const problems = passwordProblems(form.password);

  const set = (key: keyof typeof form, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));
  const Err = ({ k }: { k: string }) => (errors[k] ? <div className="field-error">{errors[k]}</div> : null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = { ...form, ...prefs };
    const v = validateRegister(payload);
    if (!v.ok) {
      setErrors(v.errors);
      setError("Revisa los campos marcados.");
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok) {
        if (json.fields) setErrors(json.fields);
        throw new Error(json.error || "No pudimos crear la cuenta.");
      }
      router.push(json.redirect);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos crear la cuenta.");
      setLoading(false);
    }
  }

  const maxBirth = new Date(Date.now() - 18 * 365.25 * 86_400_000).toISOString().slice(0, 10);

  return (
    <>
      <p className="eyebrow">Crea tu perfil</p>
      <h1>Crear cuenta</h1>
      <p className="muted">Con tu perfil adaptamos el panel, las noticias y las explicaciones del asistente a tu nivel e intereses.</p>
      <form onSubmit={onSubmit} noValidate>
        <div className="form-section">
          <h2>Tus datos</h2>
          <label htmlFor="full_name">Nombre completo</label>
          <input id="full_name" autoComplete="name" maxLength={100} value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
          <Err k="full_name" />
          <div className="row">
            <div>
              <label htmlFor="email">Correo electrónico</label>
              <input id="email" type="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              <Err k="email" />
            </div>
            <div>
              <label htmlFor="birth_date">Fecha de nacimiento</label>
              <input id="birth_date" type="date" max={maxBirth} value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} />
              <Err k="birth_date" />
            </div>
          </div>
          <div className="row">
            <div>
              <label htmlFor="password">Contraseña</label>
              <input id="password" type="password" autoComplete="new-password" value={form.password} onChange={(e) => set("password", e.target.value)} />
            </div>
            <div>
              <label htmlFor="password_confirm">Confirmar contraseña</label>
              <input id="password_confirm" type="password" autoComplete="new-password" value={form.password_confirm} onChange={(e) => set("password_confirm", e.target.value)} />
              <Err k="password_confirm" />
            </div>
          </div>
          <div className="pw-rules" aria-live="polite">
            {RULES.map(([rule, label]) => (
              <span key={rule} className={form.password && !problems.includes(rule) ? "ok" : ""}>{form.password && !problems.includes(rule) ? "✓ " : ""}{label}</span>
            ))}
          </div>
          <Err k="password" />
        </div>

        <div className="form-section">
          <h2>Tu perfil inversor</h2>
          <PreferenceFields values={prefs} onChange={setPrefs} errors={errors} />
        </div>

        <label className="check">
          <input type="checkbox" checked={form.accept_terms} onChange={(e) => set("accept_terms", e.target.checked)} />
          <span>Entiendo que Vesor es una herramienta informativa y educativa: no es asesoría financiera ni garantiza rendimientos.</span>
        </label>
        <Err k="accept_terms" />

        {error && <div className="error" role="alert">{error}</div>}
        <button className="btn block" disabled={loading}>{loading ? "Creando cuenta…" : "Crear mi cuenta"}</button>
      </form>
      <div className="auth-links">
        <span className="muted">¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link></span>
      </div>
    </>
  );
}
