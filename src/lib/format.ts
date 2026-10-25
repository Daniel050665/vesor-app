export const usd = (n: number) =>
  n.toLocaleString("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: n < 5 ? 4 : 2 });

export const pct = (n: number | null | undefined, digits = 2) =>
  n === null || n === undefined || !Number.isFinite(n) ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`;

export const num = (n: number | null | undefined, digits = 2) =>
  n === null || n === undefined || !Number.isFinite(n) ? "—" : n.toLocaleString("es-CO", { maximumFractionDigits: digits });

const TZ = "America/Bogota";

export const dateTime = (d: string | Date) =>
  new Date(d).toLocaleString("es-CO", { timeZone: TZ, dateStyle: "medium", timeStyle: "short" });

export const dateOnly = (d: string | Date) => new Date(d).toLocaleDateString("es-CO", { timeZone: TZ, dateStyle: "long" });

export const dayKey = (d: string | Date) => new Date(d).toLocaleDateString("en-CA", { timeZone: TZ });

export function timeAgo(d: string | Date) {
  const minutes = Math.round((Date.now() - new Date(d).getTime()) / 60_000);
  if (minutes < 1) return "hace un momento";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "ayer" : `hace ${days} días`;
}
