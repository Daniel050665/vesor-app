import type { Nivel } from "@/lib/types";

const ETIQUETA: Record<Nivel, string> = { bajo: "Riesgo bajo", medio: "Riesgo medio", alto: "Riesgo alto" };

export function nivelLabel(n: Nivel) {
  return ETIQUETA[n];
}

export default function Semaforo({ nivel }: { nivel: Nivel }) {
  return (
    <div className="semaforo" role="img" aria-label={ETIQUETA[nivel]}>
      <div className={`luz rojo ${nivel === "alto" ? "on" : ""}`} />
      <div className={`luz amarillo ${nivel === "medio" ? "on" : ""}`} />
      <div className={`luz verde ${nivel === "bajo" ? "on" : ""}`} />
    </div>
  );
}
