import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { apiUser, jsonError, readJson } from "@/lib/auth";
import { findAsset } from "@/lib/assets";
import { logActivity } from "@/lib/activity";

export async function GET(request: Request) {
  const { user, error } = await apiUser(request);
  if (error) return error;
  const rows = await query<{ symbol: string }>(`select symbol from watchlist where user_id = $1 order by created_at`, [user.id]);
  return NextResponse.json({ symbols: rows.map((r) => r.symbol) });
}

async function symbolFrom(request: Request) {
  const body = await readJson(request);
  return findAsset(String(body?.symbol ?? ""));
}

export async function POST(request: Request) {
  const { user, error } = await apiUser(request);
  if (error) return error;
  const asset = await symbolFrom(request);
  if (!asset) return jsonError("Activo no encontrado en el catálogo.", 404);
  const inserted = await query(
    `insert into watchlist (user_id, symbol) values ($1, $2) on conflict do nothing returning symbol`,
    [user.id, asset.symbol]
  );
  if (inserted.length) await logActivity(user.id, "favorite_add", `${asset.symbol} agregado a seguimiento`, { symbol: asset.symbol });
  return NextResponse.json({ ok: true, watching: true });
}

export async function DELETE(request: Request) {
  const { user, error } = await apiUser(request);
  if (error) return error;
  const asset = await symbolFrom(request);
  if (!asset) return jsonError("Activo no encontrado en el catálogo.", 404);
  const removed = await query(`delete from watchlist where user_id = $1 and symbol = $2 returning symbol`, [user.id, asset.symbol]);
  if (removed.length) await logActivity(user.id, "favorite_remove", `${asset.symbol} quitado de seguimiento`, { symbol: asset.symbol });
  return NextResponse.json({ ok: true, watching: false });
}
