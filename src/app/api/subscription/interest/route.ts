import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

// «Hablar con ventas» del plan Empresas: registra el interés (una vez al día) para medir la demanda B2B.
export async function POST(request: Request) {
  const { user, error } = await apiUser(request);
  if (error) return error;
  await logActivity(user.id, "plan_interest", "Solicitó información del plan Empresas", { correo: user.email }, { target: "empresas", windowMinutes: 24 * 60 });
  return NextResponse.json({ ok: true });
}
