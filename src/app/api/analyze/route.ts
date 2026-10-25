import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { apiUser, jsonError, readJson } from "@/lib/auth";
import { validarInput } from "@/lib/types";
import { evaluarRiesgo } from "@/lib/risk";
import { logActivity } from "@/lib/activity";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { user, error } = await apiUser(req);
  if (error) return error;
  if (!process.env.ANTHROPIC_API_KEY) return jsonError("La evaluación con IA no está configurada (falta ANTHROPIC_API_KEY).", 503);

  const body = await readJson(req);
  if (!body) return jsonError("Solicitud inválida.", 400);
  const v = validarInput(body);
  if (!v.ok) return NextResponse.json({ error: "Revisa los campos marcados.", fields: v.errors }, { status: 422 });

  try {
    const { resultado, raw } = await evaluarRiesgo(v.data);
    const data = await queryOne<{ id: string }>(
      `insert into analyses (user_id, kind, nombre, input, nivel, resultado, raw_response)
       values ($1, 'riesgo_ia', $2, $3::jsonb, $4, $5::jsonb, $6) returning id`,
      [user.id, v.data.nombre, JSON.stringify(v.data), resultado.nivel, JSON.stringify(resultado), raw]
    );
    await logActivity(user.id, "analysis", `Evaluación de riesgo con IA: ${v.data.nombre}`, { analysisId: data!.id, nivel: resultado.nivel });
    return NextResponse.json({ id: data!.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error inesperado.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
