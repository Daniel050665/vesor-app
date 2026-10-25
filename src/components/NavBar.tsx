import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "@/lib/auth";
import LogoutButton from "./LogoutButton";
import NavLinks from "./NavLinks";

export const dynamic = "force-dynamic";

export default async function NavBar() {
  const user = await getCurrentUser().catch(() => null);
  const links = user
    ? [
        { href: "/panel", label: "Panel" },
        { href: "/mercado", label: "Mercado" },
        { href: "/analizar", label: "Análisis de riesgo" },
        { href: "/chat", label: "Asistente IA" },
        { href: "/noticias", label: "Noticias" },
        { href: "/historial", label: "Historial" },
        { href: "/perfil", label: "Perfil" },
        ...(user.role === "admin" ? [{ href: "/admin", label: "Admin" }] : []),
      ]
    : [{ href: "/noticias", label: "Noticias" }];

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link href={user ? "/panel" : "/"} className="brand" aria-label="Vesor Group, inicio">
          <Image src="/vesor-group-logo.svg" alt="Vesor Group" width={76} height={76} priority className="brand-logo" />
          <span className="brand-word">vesor<span>.</span></span>
        </Link>
        <NavLinks links={links} />
        <div className="nav-actions">
          {user ? (
            <>
              <span className="nav-user" title={user.email}>
                {user.full_name.split(" ")[0]}
                {user.role === "admin" && <em className="role-chip">admin</em>}
              </span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="nav-plain">Entrar</Link>
              <Link href="/registro" className="pill pill-primary">Crear cuenta</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
