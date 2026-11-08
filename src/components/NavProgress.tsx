"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Barra fina de progreso al navegar entre páginas internas. Se activa al hacer clic en un enlace
 * del mismo sitio y se oculta cuando cambia la ruta. No usa loading.tsx para no alterar
 * las redirecciones ni los códigos de estado del servidor.
 */
export default function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [active, setActive] = useState(false);

  useEffect(() => setActive(false), [pathname, search]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as HTMLElement).closest("a");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      setActive(true);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (!active) return;
    const safety = window.setTimeout(() => setActive(false), 15000);
    return () => window.clearTimeout(safety);
  }, [active]);

  if (!active) return null;
  return (
    <div className="page-loading" role="status" aria-live="polite">
      <span className="page-loading-bar" />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
