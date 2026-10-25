import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { apiUser, jsonError, readJson } from "@/lib/auth";
import { DEFAULT_SIMULATION, DEMO_COMPANIES, runSimulation, type SimulationConfig } from "@/lib/simulation";
import { logActivity } from "@/lib/activity";

// El resultado se recalcula en el servidor a partir de la configuración: no se confía en el cliente.
export async function POST(request: Request) {
  const { user, error } = await apiUser(request);
  if (error) return error;
  const body = await readJson(request);
  const raw = (body?.config ?? {}) as Partial<SimulationConfig>;
  if (!DEMO_COMPANIES.some((c) => c.symbol === raw.company)) return jsonError("Empresa no válida.", 422);

  const num = (v: unknown, min: number, max: number, def: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
  };
  const config: SimulationConfig = {
    ...DEFAULT_SIMULATION,
    company: String(raw.company),
    amount: num(raw.amount, 0, 1e13, 0),
    context: String(raw.context ?? "").slice(0, 3000),
    startDate: /^\d{4}-\d{2}-\d{2}$/.test(String(raw.startDate)) ? String(raw.startDate) : DEFAULT_SIMULATION.startDate,
    endDate: /^\d{4}-\d{2}-\d{2}$/.test(String(raw.endDate)) ? String(raw.endDate) : DEFAULT_SIMULATION.endDate,
    mode: raw.mode === "personalizado" ? "personalizado" : "automatico",
    level: num(raw.level, 1, 6, 3),
    maxNews: num(raw.maxNews, 5, 50, 15),
    relationDepth: num(raw.relationDepth, 0, 2, 1),
    simulations: num(raw.simulations, 50, 1000, 250),
    sensitivity: raw.sensitivity === "alta" || raw.sensitivity === "baja" ? raw.sensitivity : "media",
    includeRelations: raw.includeRelations !== false,
  };
  const result = runSimulation(config);
  const nivel = result.meanRisk < 34 ? "bajo" : result.meanRisk < 67 ? "medio" : "alto";
  const summary = {
    meanRisk: result.meanRisk,
    standardDeviation: result.standardDeviation,
    confidence: result.confidence,
    trend: result.trend,
    advice: result.advice,
    warning: result.warning,
    contextSignals: result.contextSignals,
    scenarios: result.scenarios,
    relations: result.relations,
    newsCount: result.analyzedNews.length,
    company: { symbol: result.company.symbol, name: result.company.name, sector: result.company.sector },
  };
  const saved = await queryOne<{ id: string }>(
    `insert into analyses (user_id, kind, nombre, input, nivel, resultado) values ($1, 'simulacion', $2, $3::jsonb, $4, $5::jsonb) returning id`,
    [user.id, `${result.company.name} (${result.company.symbol})`, JSON.stringify(config), nivel, JSON.stringify(summary)]
  );
  await logActivity(user.id, "simulation", `Simulación de riesgo: ${result.company.name}`, {
    analysisId: saved!.id,
    meanRisk: result.meanRisk,
    nivel,
    datos: "Simulación con datos de demostración",
  });
  return NextResponse.json({ id: saved!.id });
}
