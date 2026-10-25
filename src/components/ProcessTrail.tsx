"use client";

import { useEffect, useRef, useState } from "react";

const STEPS = [
  ["context", "Lo que sabes", "Cuéntanos qué te ofrecieron."],
  ["evidence", "Señales", "Revisa qué datos llaman la atención."],
  ["probability", "Riesgo posible", "Compara resultados buenos y malos."],
  ["relations", "Empresas conectadas", "Mira qué empresas pueden influir."],
] as const;

export default function ProcessTrail() {
  const [activeStep, setActiveStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.25 });
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    setActiveStep(0);
    const timer = window.setInterval(() => {
      setActiveStep((current) => (current + 1) % STEPS.length);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [visible]);

  return (
    <section className="landing-process" aria-label="Cómo funciona el análisis">
      <div className="process-heading"><p className="landing-kicker">Cómo funciona</p><h2>Entiende una oportunidad paso a paso.</h2><p>Vesor revisa lo que sabes y te muestra qué podría pasar.</p></div>
      <div className="process-track" ref={trackRef}>
        <div className="process-progress" style={{ transform: `scaleX(${activeStep / (STEPS.length - 1)})` }} />
        {STEPS.map(([kind, title, text], index) => <article className={`process-step ${activeStep === index ? "process-step-active" : ""}`} key={kind}>
          <span className={`process-icon process-icon-${kind}`}>{trailIcon(kind)}</span>
          <strong>{title}</strong>
          <p>{text}</p>
        </article>)}
      </div>
    </section>
  );
}

function trailIcon(kind: string) {
  if (kind === "evidence") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 5 5" /></svg>;
  if (kind === "probability") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18c3-10 6-10 8-3s5 7 8-9" /><path d="M4 20h16" /></svg>;
  if (kind === "relations") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2.5" /><circle cx="18" cy="5" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m7 11 8-5M7 13l8 5" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M4 8h16M6 8l-4 7h8zM18 8l-3 6h6z" /></svg>;
}
