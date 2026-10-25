import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth";
import { queryActivity } from "@/lib/activity-query";

// Historial del usuario autenticado (solo sus propias actividades). Filtros: tipo, desde, hasta, q, page.
export async function GET(request: Request) {
  const { user, error } = await apiUser(request);
  if (error) return error;
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const { usuario: _ignored, ...filters } = params;
  const result = await queryActivity(filters, user.id);
  return NextResponse.json(result);
}
