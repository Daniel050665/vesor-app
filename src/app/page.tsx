import Link from "next/link";
import Image from "next/image";
import ScrollReveal from "@/components/ScrollReveal";
import ProcessTrail from "@/components/ProcessTrail";
import FloatingCompanies from "@/components/FloatingCompanies";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser().catch(() => null);
  return (
    <div className="landing-home">
      <div className="landing-auth">
        {user ? (
          <Link href="/panel">Ir a mi panel →</Link>
        ) : (
          <>
            <Link href="/login">Iniciar sesión</Link>
            <Link href="/registro" className="pill pill-primary pill-sm">Crear cuenta</Link>
          </>
        )}
      </div>
      <div className="landing-sparkles" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
      <FloatingCompanies />
      <section className="landing-hero">
        <div className="landing-copy">
          <Image src="/vesor-hero-mark.png" alt="Vesor Group" width={390} height={130} className="landing-hero-mark" priority />
          <h1>Entiende el riesgo antes de mover tu dinero.</h1>
          <p className="landing-description">
            Explora posibles resultados, revisa las señales y entiende mejor los riesgos antes de invertir.
          </p>
          <div className="landing-actions">
            <Link href={user ? "/panel" : "/registro"} className="landing-text-link">Comienza tu análisis inteligente <span aria-hidden="true">↗</span></Link>
          </div>
        </div>

        <div className="scenario-orbit" aria-label="Visualización de escenarios de riesgo" role="img">
          <div className="orbit-ring orbit-ring-large"><span /></div>
          <div className="orbit-ring orbit-ring-small"><span /></div>
          <div className="orbit-company orbit-company-one"><div className="orbit-node"><Image src="/company-logos/tsmc-brand.svg" alt="TSMC" width={72} height={30} /></div></div>
          <div className="orbit-company orbit-company-two"><div className="orbit-node"><Image src="/company-logos/microsoft-brand.svg" alt="Microsoft" width={82} height={32} /></div></div>
          <div className="orbit-company orbit-company-three"><div className="orbit-node"><Image src="/company-logos/amd.svg" alt="AMD" width={60} height={30} /></div></div>
          <div className="orbit-company orbit-company-four"><div className="orbit-node"><Image src="/company-logos/nvidia.svg" alt="NVIDIA" width={70} height={30} /></div></div>
          <div className="orbit-core">
            <Image src="/vesor-orbit-logo-final.png" alt="Vesor" width={154} height={86} className="orbit-brand-image" />
          </div>
        </div>
      </section>

      <ScrollReveal className="landing-process-wrap"><ProcessTrail /></ScrollReveal>

      <ScrollReveal className="landing-principles-wrap"><section className="landing-principles" aria-label="Principios de Vesor">
        <article><span>01</span><h2>Datos importantes</h2><p>Revisamos noticias y señales antes de mostrarte un resultado.</p></article>
        <article><span>02</span><h2>Posibles resultados</h2><p>Comparamos lo bueno, lo malo y lo que todavía no se puede saber.</p></article>
        <article><span>03</span><h2>Una visión más amplia</h2><p>Vemos cómo una empresa puede afectar a otras.</p></article>
      </section></ScrollReveal>

      <ScrollReveal className="landing-final-cta-wrap"><section className="landing-final-cta">
        <div><p className="landing-kicker">Tu siguiente decisión merece información clara</p><h2>Empieza con una pregunta. Explora lo que podría pasar.</h2></div>
      </section></ScrollReveal>
      <p className="landing-disclaimer">Vesor es una herramienta informativa. Sus estimaciones no constituyen asesoría financiera.</p>
    </div>
  );
}
