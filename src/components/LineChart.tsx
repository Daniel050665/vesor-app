import type { PricePoint } from "@/lib/market-data";

/** Gráfico de línea en SVG renderizado en el servidor (sin dependencias). */
export default function LineChart({ points, height = 220, label }: { points: PricePoint[]; height?: number; label: string }) {
  if (points.length < 2) return <p className="muted">Sin suficientes datos para graficar.</p>;
  const width = 720;
  const pad = { l: 8, r: 56, t: 12, b: 24 };
  const closes = points.map((p) => p.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const x = (i: number) => pad.l + (i / (points.length - 1)) * (width - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - min) / range) * (height - pad.t - pad.b);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.close).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${height - pad.b} L${x(0).toFixed(1)},${height - pad.b} Z`;
  const up = closes[closes.length - 1] >= closes[0];
  const color = up ? "var(--gain)" : "var(--loss)";
  const ticks = [max, (max + min) / 2, min];
  const fmt = (v: number) => (v >= 1000 ? v.toLocaleString("es-CO", { maximumFractionDigits: 0 }) : v.toLocaleString("es-CO", { maximumFractionDigits: v < 5 ? 3 : 2 }));

  return (
    <svg className="spark" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      {ticks.map((t) => (
        <g key={t}>
          <line className="spark-grid" x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} />
          <text className="spark-axis" x={width - pad.r + 6} y={y(t) + 4}>{fmt(t)}</text>
        </g>
      ))}
      <path d={area} fill={color} className="spark-area" />
      <path d={line} stroke={color} className="spark-line" />
      <text className="spark-axis" x={pad.l} y={height - 6}>{points[0].date}</text>
      <text className="spark-axis" x={width - pad.r} y={height - 6} textAnchor="end">{points[points.length - 1].date}</text>
    </svg>
  );
}
