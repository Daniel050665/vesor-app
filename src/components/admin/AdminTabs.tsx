"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Resumen y estado" },
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin/actividad", label: "Registros de actividad" },
  { href: "/admin/noticias", label: "Fuentes de noticias" },
];

export default function AdminTabs() {
  const pathname = usePathname();
  return (
    <nav className="admin-tabs" aria-label="Secciones de administración">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={`toggle ${pathname === t.href ? "on" : ""}`}>{t.label}</Link>
      ))}
    </nav>
  );
}
