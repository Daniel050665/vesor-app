"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WatchButton({ symbol, watching, compact = false }: { symbol: string; watching: boolean; compact?: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(watching);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    setError(false);
    const response = await fetch("/api/watchlist", {
      method: on ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol }),
    }).catch(() => null);
    if (response?.ok) {
      setOn(!on);
      router.refresh();
    } else setError(true);
    setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`pill ${on ? "pill-outline" : "pill-primary"} ${compact ? "pill-sm" : ""}`}
      aria-pressed={on}
      title={error ? "No se pudo actualizar. Intenta de nuevo." : undefined}
    >
      {error ? "Reintentar" : on ? "★ Siguiendo" : "☆ Seguir"}
    </button>
  );
}
