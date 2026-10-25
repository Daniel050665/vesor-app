import { NextResponse } from "next/server";
import { destroySession, getCurrentUser, isSameOrigin, jsonError } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Origen de la solicitud no permitido.", 403);
  const user = await getCurrentUser();
  if (user) await logActivity(user.id, "logout", "Cierre de sesión");
  await destroySession();
  return NextResponse.json({ ok: true });
}
