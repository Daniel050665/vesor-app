import Image from "next/image";
import Link from "next/link";

/** Diseño de dos columnas de las pantallas de acceso: identidad visual de Vesor a la izquierda. */
export default function AuthShell({ children, narrow = false }: { children: React.ReactNode; narrow?: boolean }) {
  return (
    <div className="auth-page">
      <section className="auth-visual">
        <Link href="/" className="auth-back">← Volver al inicio</Link>
        <Image src="/vesor-eye-logo.svg" alt="" width={260} height={188} className="auth-eye" priority />
        <Image src="/vesor-hero-mark.png" alt="Vesor Group" width={370} height={124} className="auth-wordmark" />
        <p>Contexto para decisiones con más perspectiva.</p>
      </section>
      <section className="auth-panel">
        <div className={`auth-panel-inner ${narrow ? "narrow" : ""}`}>{children}</div>
      </section>
    </div>
  );
}
