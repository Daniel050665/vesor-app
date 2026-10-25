"use client";

import { useState } from "react";
import Link from "next/link";
import { normalizeEmail, validateEmail, validatePassword } from "@/lib/validation";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const problem = validateEmail(normalizeEmail(email));
    if (problem) return setError(problem);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No pudimos procesar la solicitud.");
      setMessage(payload.message);
      setDevUrl(payload.devResetUrl ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos procesar la solicitud.");
    }
    setLoading(false);
  }

  return (
    <>
      <h1>Recuperar contraseña</h1>
      <p className="muted">Te enviaremos un enlace válido por 30 minutos para crear una contraseña nueva.</p>
      {message ? (
        <>
          <div className="info">{message}</div>
          {devUrl && (
            <div className="info">
              <strong>Modo desarrollo:</strong> no hay proveedor de correo configurado. <Link href={devUrl.replace(/^https?:\/\/[^/]+/, "")}>Abrir enlace de restablecimiento</Link>
            </div>
          )}
        </>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <label htmlFor="email">Correo electrónico</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          {error && <div className="error" role="alert">{error}</div>}
          <button className="btn block" disabled={loading}>{loading ? "Enviando…" : "Enviar enlace"}</button>
        </form>
      )}
      <div className="auth-links"><Link href="/login">← Volver a iniciar sesión</Link></div>
    </>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const problem = validatePassword(password);
    if (problem) return setError(problem);
    if (password !== confirm) return setError("Las contraseñas no coinciden.");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, password_confirm: confirm }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No pudimos cambiar la contraseña.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos cambiar la contraseña.");
    }
    setLoading(false);
  }

  if (!token) {
    return (
      <>
        <h1>Enlace no válido</h1>
        <p className="muted">Solicita un nuevo enlace de recuperación.</p>
        <Link href="/recuperar" className="btn">Solicitar enlace</Link>
      </>
    );
  }
  return (
    <>
      <h1>Nueva contraseña</h1>
      {done ? (
        <>
          <div className="info">Tu contraseña se actualizó y cerramos las sesiones abiertas. Ya puedes iniciar sesión.</div>
          <Link href="/login" className="btn block">Iniciar sesión</Link>
        </>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <label htmlFor="password">Contraseña nueva</label>
          <input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="field-hint">Mínimo 10 caracteres con mayúscula, minúscula, número y símbolo.</p>
          <label htmlFor="confirm">Confirmar contraseña</label>
          <input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          {error && <div className="error" role="alert">{error}</div>}
          <button className="btn block" disabled={loading}>{loading ? "Guardando…" : "Guardar contraseña"}</button>
        </form>
      )}
    </>
  );
}
