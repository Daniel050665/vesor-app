import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import Semaforo, { nivelLabel } from "@/components/Semaforo";
import PrintButton from "@/components/PrintButton";
import type { Nivel, OportunidadInput, ResultadoRiesgo } from "@/lib/types";
import type { SimulationConfig } from "@/lib/simulation";
import { dateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

type SimulationSummary = {
  meanRisk: number;
  standardDeviation: number;
  confidence: string;
  trend: string;
  advice: string;
  warning: string | null;
  contextSignals: { label: string; detail: string; impact: number }[];
  scenarios: { name: string; probability: number; description: string }[];
  relations: { symbol: string; name: string; type: string; impact: number }[];
  newsCount: number;
  company: { symbol: string; name: string; sector: string };
};

export default async function ResultadoPage({ params }: { params: { id: string } }) {
  const user = await requireUser(`/resultado/${params.id}`);
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  // Solo el dueño puede ver su análisis: la condición user_id se aplica en la consulta.
  const data = await queryOne<{ id: string; created_at: string; nombre: string; kind: string; nivel: Nivel; input: unknown; resultado: unknown }>(
    `select id, created_at, nombre, kind, nivel, input, resultado from analyses where id = $1 and user_id = $2`,
    [params.id, user.id]
  );
  if (!data) notFound();

  const actions = (
    <div className="actions">
      <Link href="/analizar" className="pill pill-primary">Nuevo análisis</Link>
      <Link href="/historial" className="pill pill-outline">Volver al historial</Link>
      <PrintButton />
    </div>
  );

  if (data.kind === "simulacion") {
    const r = data.resultado as SimulationSummary;
    const c = data.input as SimulationConfig;
    return (
      <div style={{ maxWidth: 860 }}>
        <div className="card">
          <p className="muted">{dateTime(data.created_at)} · Simulación de riesgo · {r.company.sector}</p>
          <h1>{data.nombre}</h1>
          <div className="semaforo-wrap">
            <Semaforo nivel={data.nivel} />
            <div>
              <span className={`badge ${data.nivel}`}>{nivelLabel(data.nivel)}</span>
              <p style={{ marginTop: 10 }}>Riesgo estimado <strong>{r.meanRisk}%</strong> (±{r.standardDeviation}%), confianza {r.confidence}, tendencia posible {r.trend}.</p>
              <p className="muted">Periodo {c.startDate} a {c.endDate} · nivel de complejidad {c.level} · {r.newsCount} noticias de demostración analizadas.</p>
            </div>
          </div>
          {r.warning && <div className="info">{r.warning}</div>}
        </div>
        <div className="card">
          <h2>Orientación</h2>
          <p>{r.advice}</p>
          {r.contextSignals.length > 0 && r.contextSignals.map((s) => (
            <div className="factor" key={s.label}><strong>{s.label} ({s.impact > 0 ? "+" : ""}{s.impact} riesgo)</strong>{s.detail}</div>
          ))}
        </div>
        <div className="card">
          <h2>Escenarios</h2>
          {r.scenarios.map((s) => (
            <div className="factor" key={s.name}><strong>{s.name}: {Math.round(s.probability)}%</strong>{s.description}</div>
          ))}
        </div>
        {actions}
        <p className="disclaimer">Simulación con datos de demostración. Es una estimación educativa, no una predicción ni asesoría financiera.</p>
      </div>
    );
  }

  const r = data.resultado as ResultadoRiesgo;
  const i = data.input as OportunidadInput;
  return (
    <div style={{ maxWidth: 860 }}>
      <div className="card">
        <p className="muted">{dateTime(data.created_at)} · {i.tipo}</p>
        <h1>{data.nombre}</h1>
        <div className="semaforo-wrap">
          <Semaforo nivel={r.nivel} />
          <div>
            <span className={`badge ${r.nivel}`}>{nivelLabel(r.nivel)}</span>
            <p style={{ marginTop: 10 }}>{r.resumen}</p>
            <p className="muted">Confianza del análisis: {r.confianza}</p>
          </div>
        </div>
      </div>
      <div className="card">
        <h2>Por qué esta clasificación</h2>
        {r.factores.map((f, idx) => (
          <div className="factor" key={idx}><strong>{f.titulo}</strong>{f.detalle}</div>
        ))}
      </div>
      {(r.recomendacion || r.informacion_faltante.length > 0) && (
        <div className="card">
          <h2>Qué verificar antes de decidir</h2>
          {r.recomendacion && <p>{r.recomendacion}</p>}
          {r.informacion_faltante.length > 0 && (
            <ul>{r.informacion_faltante.map((m, idx) => <li key={idx}>{m}</li>)}</ul>
          )}
        </div>
      )}
      {actions}
      <p className="disclaimer">
        Esta evaluación la genera una IA con base solo en lo que escribiste. No es asesoría financiera ni garantiza que una oportunidad sea legítima o fraudulenta.
      </p>
    </div>
  );
}
