"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UserActions({ id, email, status, role, isSelf }: { id: string; email: string; status: string; role: string; isSelf: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function update(change: { status?: string; role?: string }, confirmText: string) {
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(change),
    }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    setBusy(false);
    if (!response?.ok) return setError(payload.error || "No se pudo actualizar.");
    router.refresh();
  }

  if (isSelf) return <span className="muted small">Tu cuenta</span>;
  return (
    <div className="actions" style={{ marginTop: 0, flexWrap: "nowrap" }}>
      {status === "active" ? (
        <button className="pill pill-danger pill-sm" disabled={busy} onClick={() => update({ status: "suspended" }, `¿Suspender la cuenta ${email}? Se cerrarán sus sesiones.`)}>Suspender</button>
      ) : (
        <button className="pill pill-outline pill-sm" disabled={busy} onClick={() => update({ status: "active" }, `¿Reactivar la cuenta ${email}?`)}>Reactivar</button>
      )}
      {role === "admin" ? (
        <button className="pill pill-outline pill-sm" disabled={busy} onClick={() => update({ role: "user" }, `¿Quitar permisos de administrador a ${email}?`)}>Quitar admin</button>
      ) : (
        <button className="pill pill-outline pill-sm" disabled={busy} onClick={() => update({ role: "admin" }, `¿Dar permisos de administrador a ${email}?`)}>Hacer admin</button>
      )}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
