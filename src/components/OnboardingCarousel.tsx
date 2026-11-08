"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const HIDE_KEY = "vesor_bienvenida_oculta";

const SLIDES = [
  {
    title: "Tu panel",
    text: "El mercado, tus activos y las ideas según tu perfil, en un solo lugar.",
    icon: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  },
  {
    title: "Pregunta a la IA",
    text: "Analiza o compara activos y entiende cualquier concepto financiero.",
    icon: <path d="M4 5h16v11H9l-5 4zM8 9h8M8 12h5" />,
  },
  {
    title: "Analiza el riesgo",
    text: "Simula escenarios y revisa las señales antes de poner tu dinero.",
    icon: <path d="M3 18c4-9 7-9 9-3s5 6 9-8M3 21h18" />,
  },
  {
    title: "Noticias e historial",
    text: "Noticias de tus temas y todo lo que haces, guardado para después.",
    icon: <path d="M5 4h11l3 3v13H5zM8 9h8M8 13h8M8 17h5" />,
  },
];

/** Carrusel de bienvenida que aparece al entrar al panel tras iniciar sesión o registrarse. */
export default function OnboardingCarousel({ name }: { name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [dontShow, setDontShow] = useState(false);
  const touchX = useRef<number | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const last = index === SLIDES.length - 1;

  useEffect(() => {
    let hidden = false;
    try {
      hidden = localStorage.getItem(HIDE_KEY) === "1";
    } catch {
      // Sin acceso a localStorage: se muestra igual.
    }
    if (hidden) router.replace("/panel", { scroll: false });
    else setOpen(true);
  }, [router]);

  const close = useCallback(() => {
    if (dontShow) {
      try {
        localStorage.setItem(HIDE_KEY, "1");
      } catch {}
    }
    setOpen(false);
    router.replace("/panel", { scroll: false });
  }, [dontShow, router]);

  const go = useCallback((delta: number) => setIndex((i) => Math.min(SLIDES.length - 1, Math.max(0, i + delta))), []);

  useEffect(() => {
    if (!open) return;
    nextRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, go]);

  if (!open) return null;

  return (
    <div className="onb-backdrop" role="dialog" aria-modal="true" aria-labelledby="onb-title" onClick={(e) => e.target === e.currentTarget && close()}>
      <div
        className="onb"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        <button className="onb-skip" onClick={close}>Saltar</button>
        <p className="eyebrow">Bienvenido, {name}</p>
        <div className="onb-track" style={{ transform: `translateX(-${index * 100}%)` }}>
          {SLIDES.map((s, i) => (
            <section key={s.title} className="onb-slide" aria-hidden={i !== index} aria-roledescription="diapositiva" aria-label={`${i + 1} de ${SLIDES.length}`}>
              <div className="onb-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">{s.icon}</svg>
              </div>
              <h2 id={i === index ? "onb-title" : undefined}>{s.title}</h2>
              <p>{s.text}</p>
            </section>
          ))}
        </div>
        <div className="onb-dots" role="tablist" aria-label="Diapositivas">
          {SLIDES.map((s, i) => (
            <button key={s.title} role="tab" aria-selected={i === index} aria-label={s.title} className={i === index ? "on" : ""} onClick={() => setIndex(i)} />
          ))}
        </div>
        <div className="onb-actions">
          <button className="pill pill-outline" onClick={() => go(-1)} disabled={index === 0}>Atrás</button>
          <button ref={nextRef} className="pill pill-primary" onClick={() => (last ? close() : go(1))}>{last ? "Empezar" : "Siguiente"}</button>
        </div>
        <label className="onb-hide">
          <input type="checkbox" checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} /> No volver a mostrar
        </label>
      </div>
    </div>
  );
}
