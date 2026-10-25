"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { normalizeEmail, validateEmail } from "@/lib/validation";

export default function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const emailError = validateEmail(normalizeEmail(email));
    if (emailError) return setError(emailError);
    if (!password) return setError("Escribe tu contraseña.");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, next }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No pudimos iniciar sesión.");
      router.push(payload.redirect);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos iniciar sesión.");
      setLoading(false);
    }
  }

  return (
    <>
      <p className="eyebrow">Bienvenido de vuelta</p>
      <h1>Iniciar sesión</h1>
      <p className="muted">Accede a tu panel, tu historial y el asistente de análisis.</p>
      {notice && <div className="info">{notice}</div>}
      <form onSubmit={onSubmit} noValidate>
        <label htmlFor="email">Correo electrónico</label>
        <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label htmlFor="password">Contraseña</label>
        <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <div className="error" role="alert">{error}</div>}
        <button className="btn block" disabled={loading}>{loading ? "Verificando…" : "Entrar"}</button>
      </form>
      <div className="auth-links">
        <Link href="/recuperar">¿Olvidaste tu contraseña?</Link>
        <span className="muted">¿No tienes cuenta? <Link href="/registro">Regístrate</Link></span>
      </div>
    </>
  );
}
