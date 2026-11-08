import { NextResponse } from "next/server";
import { apiUser, jsonError, readJson } from "@/lib/auth";
import { cancelSubscription, cop, planStatus, subscribe } from "@/lib/billing";
import { logActivity } from "@/lib/activity";

export async function GET(request: Request) {
  const { user, error } = await apiUser(request);
  if (error) return error;
  return NextResponse.json(await planStatus(user.id));
}

// Pago SIMULADO: el servidor no recibe ni guarda datos de tarjeta; solo el plan y el ciclo elegidos.
export async function POST(request: Request) {
  const { user, error } = await apiUser(request);
  if (error) return error;
  const body = await readJson(request);
  const cycle = body?.cycle;
  if (cycle !== "mensual" && cycle !== "anual") return jsonError("Elige el ciclo de pago: mensual o anual.", 422);

  const sub = await subscribe(user.id, cycle);
  if (!sub) return jsonError("No pudimos activar la suscripción.", 500);
  await logActivity(user.id, "subscription", `Plan Premium ${cycle} activado (simulado)`, {
    receipt: sub.receipt_code,
    precio: cop(sub.price_cop),
    pago: "Simulado, sin cobro real",
  });
  return NextResponse.json({ ok: true, subscription: sub });
}

export async function DELETE(request: Request) {
  const { user, error } = await apiUser(request);
  if (error) return error;
  const canceled = await cancelSubscription(user.id);
  if (!canceled) return jsonError("No tienes una suscripción activa.", 404);
  await logActivity(user.id, "subscription_cancel", "Plan Premium cancelado");
  return NextResponse.json({ ok: true });
}
