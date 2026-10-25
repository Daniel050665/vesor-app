import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { apiUser, jsonError, readJson } from "@/lib/auth";
import { validatePreferences } from "@/lib/validation";
import { logActivity } from "@/lib/activity";

export async function GET(request: Request) {
  const { user, error } = await apiUser(request);
  if (error) return error;
  return NextResponse.json({ user });
}

export async function PUT(request: Request) {
  const { user, error } = await apiUser(request);
  if (error) return error;
  const body = await readJson(request);
  if (!body) return jsonError("Solicitud inválida.", 400);

  const fullName = String(body.full_name ?? "").trim().replace(/\s+/g, " ");
  const fields: Record<string, string> = {};
  if (fullName.length < 3 || fullName.length > 100 || /[<>{}]/.test(fullName)) fields.full_name = "Escribe un nombre válido.";
  const v = validatePreferences(body);
  if (!v.ok) Object.assign(fields, v.errors);
  if (Object.keys(fields).length || !v.ok) return jsonError("Revisa los campos marcados.", 422, { fields });

  const d = v.data;
  await query(
    `update app_users set full_name = $2, experience = $3, interests = $4::jsonb, goal = $5, horizon = $6, risk_tolerance = $7, updated_at = now()
     where id = $1`,
    [user.id, fullName, d.experience, JSON.stringify(d.interests), d.goal, d.horizon, d.risk_tolerance]
  );
  await logActivity(user.id, "profile_update", "Preferencias de inversión actualizadas", {
    antes: { experience: user.experience, interests: user.interests, risk_tolerance: user.risk_tolerance },
    despues: { experience: d.experience, interests: d.interests, risk_tolerance: d.risk_tolerance },
  });
  return NextResponse.json({ ok: true });
}
