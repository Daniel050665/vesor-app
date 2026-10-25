"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DEFAULT_SIMULATION,
  DEMO_COMPANIES,
  runSimulation,
  type SimulationConfig,
  type SimulationResult,
} from "@/lib/simulation";

type Tab = "resumen" | "contexto" | "evidencia" | "relaciones" | "escenarios";

const LEVELS = [
  [1, "Empresa individual"],
  [2, "Relaciones directas"],
  [3, "Red cercana"],
  [4, "Sector y competencia"],
  [5, "Red ampliada"],
  [6, "Red + escenarios"],
] as const;

function percent(value: number) {
  return `${Math.round(value)}%`;
}

function RiskCurve({ result }: { result: SimulationResult }) {
  const maxDensity = Math.max(...result.distribution.map((point) => point.density));
  const points = result.distribution
    .map((point) => `${40 + point.risk * 4.5},${190 - (point.density / maxDensity) * 145}`)
    .join(" ");
  const meanX = 40 + result.meanRisk * 4.5;
  const lowerX = 40 + Math.max(0, result.meanRisk - result.standardDeviation) * 4.5;
  const upperX = 40 + Math.min(100, result.meanRisk + result.standardDeviation) * 4.5;

  return (
    <div className="risk-chart-wrap">
      <svg className="risk-chart" viewBox="0 0 520 230" role="img" aria-label="Distribución estimada del riesgo">
        <line x1="40" y1="190" x2="490" y2="190" className="chart-axis" />
        <line x1="40" y1="45" x2="40" y2="190" className="chart-axis" />
        <rect x={lowerX} y="45" width={Math.max(0, upperX - lowerX)} height="145" className="chart-band" />
        <polyline points={points} className="chart-curve" />
        <line x1={meanX} y1="38" x2={meanX} y2="190" className="chart-mean" />
        <text x="40" y="214" className="chart-label">0</text>
        <text x="255" y="214" className="chart-label">50</text>
        <text x="478" y="214" className="chart-label">100</text>
        <text x={Math.min(445, Math.max(46, meanX - 22))} y="30" className="chart-mean-label">{percent(result.meanRisk)}</text>
      </svg>
      <div className="chart-legend">
        <span><i className="legend-dot gold" /> Valor estimado</span>
        <span><i className="legend-band" /> Desviación aproximada</span>
      </div>
    </div>
  );
}

function ScenarioBars({ result }: { result: SimulationResult }) {
  return (
    <div className="scenario-bars">
      {result.scenarios.map((scenario) => (
        <div className="scenario-row" key={scenario.name}>
          <div className="scenario-label"><strong>{scenario.name}</strong><span>{percent(scenario.probability)}</span></div>
          <div className="scenario-track"><span style={{ width: `${scenario.probability}%` }} /></div>
          <p>{scenario.description}</p>
        </div>
      ))}
    </div>
  );
}

function RiskPyramid({ risk }: { risk: number }) {
  const level = risk < 34 ? "bajo" : risk < 67 ? "medio" : "alto";
  return (
    <div className="risk-pyramid" role="img" aria-label={`Pirámide de riesgo ${level}, riesgo estimado ${percent(risk)}`}>
      <div className={`pyramid-tier pyramid-high ${level === "alto" ? "pyramid-active" : ""}`}><span>Alto</span></div>
      <div className={`pyramid-tier pyramid-medium ${level === "medio" ? "pyramid-active" : ""}`}><span>Medio</span></div>
      <div className={`pyramid-tier pyramid-low ${level === "bajo" ? "pyramid-active" : ""}`}><span>Bajo</span></div>
    </div>
  );
}

export default function Simulator() {
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_SIMULATION);
  const [result, setResult] = useState<SimulationResult>(() => runSimulation(DEFAULT_SIMULATION));
  const [tab, setTab] = useState<Tab>("resumen");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState<{ id: string } | { error: string } | null>(null);

  function updateConfig<K extends keyof SimulationConfig>(key: K, value: SimulationConfig[K]) {
    setConfig((current) => ({ ...current, [key]: value }));
  }

  async function simulate(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setSaved(null);
    setResult(runSimulation(config));
    setTab("resumen");
    // Se guarda en el historial; el servidor recalcula el resultado a partir de la configuración.
    try {
      const response = await fetch("/api/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const payload = await response.json();
      setSaved(response.ok ? { id: payload.id } : { error: payload.error || "No se pudo guardar en el historial." });
    } catch {
      setSaved({ error: "No se pudo guardar en el historial. Revisa tu conexión." });
    }
    setLoading(false);
  }

  const selectedLevel = LEVELS.find(([level]) => level === config.level)?.[1];

  return (
    <div className="simulator-page">
      <div className="simulator-heading">
        <div>
          <p className="eyebrow">Laboratorio de decisiones</p>
          <h1>Análisis de riesgo inteligente</h1>
          <p className="muted">Explora escenarios, revisa las señales y entiende el riesgo antes de tomar una decisión de inversión.</p>
        </div>
        <span className="prototype-tag" title="Las noticias y relaciones del simulador son datos de ejemplo">Datos de demostración</span>
      </div>

      <form className="simulator-config" onSubmit={simulate}>
        <div className="simulator-config-head">
          <div>
            <h2>Configura el escenario</h2>
            <p className="muted">El modo automático aplica valores razonables. Personaliza el alcance cuando quieras.</p>
          </div>
          <div className="mode-switch" role="group" aria-label="Modo de análisis">
            <button type="button" className={config.mode === "automatico" ? "mode-active" : ""} onClick={() => updateConfig("mode", "automatico")}>Automático</button>
            <button type="button" className={config.mode === "personalizado" ? "mode-active" : ""} onClick={() => updateConfig("mode", "personalizado")}>Personalizado</button>
          </div>
        </div>

        <div className="row">
          <div>
            <label htmlFor="company">Empresa</label>
            <select id="company" value={config.company} onChange={(event) => updateConfig("company", event.target.value)}>
              {DEMO_COMPANIES.map((company) => <option key={company.symbol} value={company.symbol}>{company.name} ({company.symbol})</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="level">Nivel de complejidad</label>
            <select id="level" value={config.level} onChange={(event) => updateConfig("level", Number(event.target.value))}>
              {LEVELS.map(([level, label]) => <option key={level} value={level}>Nivel {level} · {label}</option>)}
            </select>
          </div>
        </div>

        <div className="row">
          <div>
            <label htmlFor="startDate">Desde</label>
            <input id="startDate" type="date" value={config.startDate} onChange={(event) => updateConfig("startDate", event.target.value)} />
          </div>
          <div>
            <label htmlFor="endDate">Hasta</label>
            <input id="endDate" type="date" value={config.endDate} onChange={(event) => updateConfig("endDate", event.target.value)} />
          </div>
        </div>

        <label htmlFor="amount">Monto estimado de inversión (COP)</label>
        <input id="amount" type="number" min="0" step="10000" value={config.amount} onChange={(event) => updateConfig("amount", Number(event.target.value))} placeholder="Ej: 500000" />
        <p className="field-hint">Se usa para mostrar la exposición estimada; no cambia por sí solo el riesgo de la empresa.</p>

        <label htmlFor="context">Contexto de la oportunidad</label>
        <textarea
          id="context"
          value={config.context}
          maxLength={3000}
          onChange={(event) => updateConfig("context", event.target.value)}
          placeholder="Ej: Una persona dice que depositando en la plataforma X duplico el dinero en 30 días y pide pagar a una billetera cripto."
        />
        <p className="field-hint">Detectamos señales de riesgo en el texto. Para preguntas abiertas sobre un activo usa el Asistente IA.</p>

        {config.mode === "personalizado" && (
          <div className="advanced-config">
            <div className="row">
              <div>
                <label htmlFor="maxNews">Noticias máximas: {config.maxNews}</label>
                <input id="maxNews" type="range" min="5" max="50" step="5" value={config.maxNews} onChange={(event) => updateConfig("maxNews", Number(event.target.value))} />
              </div>
              <div>
                <label htmlFor="simulations">Simulaciones: {config.simulations}</label>
                <input id="simulations" type="range" min="50" max="1000" step="50" value={config.simulations} onChange={(event) => updateConfig("simulations", Number(event.target.value))} />
              </div>
            </div>
            <div className="row">
              <div>
                <label htmlFor="relationDepth">Profundidad de relaciones</label>
                <select id="relationDepth" value={config.relationDepth} onChange={(event) => updateConfig("relationDepth", Number(event.target.value))}>
                  <option value="0">Solo empresa</option>
                  <option value="1">Relaciones directas</option>
                  <option value="2">Segundo nivel</option>
                </select>
              </div>
              <div>
                <label htmlFor="sensitivity">Sensibilidad</label>
                <select id="sensitivity" value={config.sensitivity} onChange={(event) => updateConfig("sensitivity", event.target.value as SimulationConfig["sensitivity"])}>
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
            </div>
            <label className="check"><input type="checkbox" checked={config.includeRelations} onChange={(event) => updateConfig("includeRelations", event.target.checked)} /> Incluir empresas relacionadas</label>
          </div>
        )}

        <div className="config-summary"><span>{selectedLevel}</span><span>{config.simulations} simulaciones locales</span><span>{config.includeRelations ? `${config.relationDepth + 1} nivel(es) de relaciones` : "Sin relaciones"}</span></div>
        <button className="btn block" disabled={loading}>{loading ? "Calculando…" : "Analizar escenario"}</button>
      </form>

      {saved && "id" in saved && (
        <div className="save-bar info">
          Análisis guardado en tu historial. <Link href={`/resultado/${saved.id}`}>Ver detalle</Link> · <Link href="/historial">Ir al historial</Link>
        </div>
      )}
      {saved && "error" in saved && <div className="error save-bar">{saved.error}</div>}

      {result.warning && <div className="info simulator-warning">{result.warning}</div>}

      <section className="simulation-result">
        <div className="result-headline">
          <div><p className="muted">Resultado estimado · {result.company.sector}</p><h2>{result.company.name} ({result.company.symbol})</h2></div>
          <div className="risk-number"><strong>{percent(result.meanRisk)}</strong><span>riesgo estimado</span></div>
        </div>
        <div className="result-metrics">
          <div><span>Desviación</span><strong>±{result.standardDeviation}%</strong></div>
          <div><span>Confianza</span><strong>{result.confidence}</strong></div>
          <div><span>Tendencia posible</span><strong className={`trend-${result.trend}`}>{result.trend}</strong></div>
        </div>

        <div className="simulator-tabs" role="tablist" aria-label="Detalle de simulación">
          {([["resumen", "Resumen"], ["contexto", "Contexto"], ["evidencia", "Evidencia"], ["relaciones", "Relaciones"], ["escenarios", "Escenarios"]] as const).map(([value, label]) => (
            <button type="button" role="tab" aria-selected={tab === value} className={tab === value ? "tab-active" : ""} key={value} onClick={() => setTab(value)}>{label}</button>
          ))}
        </div>

        {tab === "resumen" && <div className="tab-panel"><RiskCurve result={result} /><div className="pyramid-block"><h3>Pirámide de riesgo</h3><RiskPyramid risk={result.meanRisk} /><p className="muted">La posición muestra la zona de riesgo estimada dentro de la distribución.</p></div><div className="exposure-line"><span>Monto simulado</span><strong>{new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(result.config.amount || 0)}</strong></div><p className="disclaimer">La distribución es una estimación de prototipo, no una predicción ni asesoría financiera.</p></div>}
        {tab === "contexto" && <div className="tab-panel context-panel"><div className="advice-box"><strong>Asistente de prototipo</strong><p>{result.advice}</p><small>Esta orientación es heurística y no sustituye asesoría financiera. Cuando conectes una API de IA, este bloque podrá enriquecerse con análisis estructurado.</small></div><div className="context-signals">{result.contextSignals.map((signal) => <article className="context-signal" key={signal.label}><div><strong>{signal.label}</strong><b>{signal.impact > 0 ? `+${signal.impact}` : signal.impact} riesgo</b></div><p>{signal.detail}</p></article>)}</div>{result.contextSignals.length === 0 && <p className="muted">No se detectaron señales específicas. Añade contexto para obtener una lectura más útil.</p>}</div>}
        {tab === "evidencia" && <div className="tab-panel"><div className="evidence-grid">{result.analyzedNews.map((news) => <article className="evidence-item" key={`${news.date}-${news.title}`}><div><strong>{news.category}</strong><span>{news.date} · {news.source}</span></div><p>{news.title}</p><b className={news.impact > 0 ? "negative" : "positive"}>{news.impact > 0 ? "Aumenta riesgo" : "Reduce riesgo"} · {news.relevance}% relevancia</b></article>)}</div>{result.analyzedNews.length === 0 && <p className="muted">No hay evidencia demo para este rango.</p>}</div>}
        {tab === "relaciones" && <div className="tab-panel"><div className="relation-grid">{result.relations.map((relation) => <article className="relation-item" key={relation.symbol}><div><strong>{relation.name} ({relation.symbol})</strong><span>{relation.type}</span></div><div className="relation-strength"><span style={{ width: `${relation.strength * 100}%` }} /><b>{Math.round(relation.strength * 100)}%</b></div><p>Impacto transmitido: {relation.impact > 0 ? "+" : ""}{relation.impact} puntos de riesgo</p></article>)}</div>{result.relations.length === 0 && <p className="muted">Las relaciones están desactivadas para este escenario.</p>}</div>}
        {tab === "escenarios" && <div className="tab-panel"><ScenarioBars result={result} /></div>}
      </section>
    </div>
  );
}
