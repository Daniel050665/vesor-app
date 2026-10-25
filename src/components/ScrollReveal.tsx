"use client";

import { useEffect, useRef } from "react";

export default function ScrollReveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      element.classList.add("is-visible");
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        element.classList.add("is-visible");
        observer.disconnect();
      }
    }, { threshold: 0.16 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <div ref={elementRef} className={`scroll-reveal ${className}`}>{children}</div>;
}
