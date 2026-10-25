"use client";

import { useState } from "react";

export default function SaveNewsButton({ articleId, saved }: { articleId: string; saved: boolean }) {
  const [on, setOn] = useState(saved);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const response = await fetch("/api/news/saved", {
      method: on ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId }),
    }).catch(() => null);
    if (response?.ok) setOn(!on);
    setBusy(false);
  }

  return (
    <button type="button" className="pill pill-outline pill-sm" onClick={toggle} disabled={busy} aria-pressed={on}>
      {on ? "★ Guardada" : "☆ Guardar"}
    </button>
  );
}
