import { ASSETS, findAsset, type Asset } from "./assets";

// Acceso a cotizaciones. Proveedores:
//  - Criptomonedas: CoinGecko (API pública, sin clave). Datos reales con atribución.
//  - Acciones/ETF: Alpha Vantage si hay ALPHA_VANTAGE_API_KEY (plan gratuito con límites y retraso).
//  - Sin proveedor o si falla: datos de DEMOSTRACIÓN deterministas, siempre marcados como tales.

export type MarketQuote = {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  change: number | null;
  changePct: number | null;
  updatedAt: string;
  source: string;
  isDelayed: boolean;
  isDemo: boolean;
};

export type PricePoint = { date: string; close: number };
export type PriceHistory = { symbol: string; points: PricePoint[]; source: string; isDemo: boolean };

const cache = new Map<string, { expires: number; value: unknown }>();
const cooldownUntil = new Map<string, number>();
const STALE_MS = 24 * 60 * 60_000;

/**
 * Caché en memoria con tolerancia a fallos: si el proveedor falla (p. ej. límite 429) se sirve el último
 * valor bueno durante 24 h y se espera un minuto antes de volver a consultar a ese proveedor.
 */
async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const provider = key.split(":")[0];
  const stale = hit && hit.expires + STALE_MS > Date.now() ? (hit.value as T) : undefined;
  if ((cooldownUntil.get(provider) ?? 0) > Date.now()) {
    if (stale !== undefined) return stale;
    throw new Error("Proveedor en pausa tras un error reciente");
  }
  try {
    const value = await load();
    cache.set(key, { expires: Date.now() + ttlMs, value });
    return value;
  } catch (error) {
    cooldownUntil.set(provider, Date.now() + 60_000);
    if (stale !== undefined) return stale;
    throw error;
  }
}

async function fetchJson(url: string, timeoutMs = 8000) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

// --- Datos de demostración deterministas (misma semilla => mismos valores) ---
function seededRandom(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const DAILY_VOL = { baja: 0.009, media: 0.017, alta: 0.035 } as const;

function demoHistory(asset: Asset, days: number): PricePoint[] {
  const rand = seededRandom(`${asset.symbol}:${new Date().toISOString().slice(0, 10)}`);
  const vol = DAILY_VOL[asset.volatility];
  const raw: number[] = [1];
  for (let i = 1; i < days; i++) {
    const shock = (rand() + rand() + rand() - 1.5) * 2 * vol; // aproximación normal
    raw.push(raw[i - 1] * (1 + shock + 0.0003));
  }
  // Se escala para que el último valor coincida con el precio de referencia demo.
  const scale = asset.demoPrice / raw[raw.length - 1];
  const today = Date.now();
  return raw.map((v, i) => ({
    date: new Date(today - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10),
    close: +(v * scale).toFixed(asset.demoPrice < 5 ? 4 : 2),
  }));
}

function demoQuote(asset: Asset): MarketQuote {
  const points = demoHistory(asset, 2);
  const [prev, last] = points;
  return {
    symbol: asset.symbol,
    name: asset.name,
    price: last.close,
    currency: "USD",
    change: +(last.close - prev.close).toFixed(4),
    changePct: +(((last.close - prev.close) / prev.close) * 100).toFixed(2),
    updatedAt: "Datos de demostración (no son cotizaciones reales)",
    source: "Demo",
    isDelayed: true,
    isDemo: true,
  };
}

// --- CoinGecko ---
async function coingeckoQuotes(assets: Asset[]): Promise<MarketQuote[]> {
  // Una sola consulta para todo el catálogo cripto, compartida por todas las páginas (cuida el límite gratuito).
  const ids = ASSETS.filter((a) => a.coingeckoId).map((a) => a.coingeckoId!).join(",");
  const data = await cached(`cg:quotes`, 120_000, () =>
    fetchJson(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`
    )
  );
  return assets.flatMap((asset) => {
    const row = (data as Record<string, { usd?: number; usd_24h_change?: number; last_updated_at?: number }>)[asset.coingeckoId!];
    if (!row?.usd) return [];
    const changePct = row.usd_24h_change ?? null;
    return [
      {
        symbol: asset.symbol,
        name: asset.name,
        price: row.usd,
        currency: "USD",
        change: changePct !== null ? +((row.usd * changePct) / (100 + changePct)).toFixed(4) : null,
        changePct: changePct !== null ? +changePct.toFixed(2) : null,
        updatedAt: row.last_updated_at
          ? `Actualizado ${new Date(row.last_updated_at * 1000).toLocaleString("es-CO", { timeZone: "America/Bogota" })} (24 h)`
          : "Variación de 24 h",
        source: "CoinGecko",
        isDelayed: false,
        isDemo: false,
      },
    ];
  });
}

async function coingeckoHistory(asset: Asset, days: number): Promise<PriceHistory> {
  const data = (await cached(`cg:hist:${asset.coingeckoId}:${days}`, 30 * 60_000, () =>
    fetchJson(`https://api.coingecko.com/api/v3/coins/${asset.coingeckoId}/market_chart?vs_currency=usd&days=${days}&interval=daily`)
  )) as { prices?: [number, number][] };
  if (!data.prices?.length) throw new Error("Sin datos históricos");
  const byDate = new Map<string, number>();
  for (const [ts, price] of data.prices) byDate.set(new Date(ts).toISOString().slice(0, 10), price);
  return {
    symbol: asset.symbol,
    points: Array.from(byDate, ([date, close]) => ({ date, close })),
    source: "CoinGecko",
    isDemo: false,
  };
}

// --- Alpha Vantage ---
async function alphaQuote(asset: Asset, apiKey: string): Promise<MarketQuote> {
  const payload = (await cached(`av:quote:${asset.symbol}`, 15 * 60_000, () =>
    fetchJson(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${asset.symbol}&apikey=${apiKey}`)
  )) as Record<string, unknown> & { "Global Quote"?: Record<string, string> };
  const quote = payload["Global Quote"];
  if (!quote?.["05. price"] || payload.Note || payload.Information) throw new Error("Alpha Vantage sin cotización (límite o símbolo)");
  return {
    symbol: asset.symbol,
    name: asset.name,
    price: Number(quote["05. price"]),
    currency: "USD",
    change: Number(quote["09. change"]),
    changePct: Number.parseFloat(quote["10. change percent"]?.replace("%", "") || "0"),
    updatedAt: `Último día de mercado: ${quote["07. latest trading day"] || "no disponible"} (con retraso)`,
    source: "Alpha Vantage",
    isDelayed: true,
    isDemo: false,
  };
}

async function alphaHistory(asset: Asset, apiKey: string): Promise<PriceHistory> {
  const payload = (await cached(`av:hist:${asset.symbol}`, 6 * 60 * 60_000, () =>
    fetchJson(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&outputsize=compact&symbol=${asset.symbol}&apikey=${apiKey}`)
  )) as Record<string, unknown> & { "Time Series (Daily)"?: Record<string, Record<string, string>> };
  const series = payload["Time Series (Daily)"];
  if (!series) throw new Error("Alpha Vantage sin serie histórica");
  const points = Object.entries(series)
    .map(([date, row]) => ({ date, close: Number(row["4. close"]) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  return { symbol: asset.symbol, points, source: "Alpha Vantage", isDemo: false };
}

function stockProviderKey() {
  const provider = process.env.MARKET_DATA_PROVIDER || (process.env.ALPHA_VANTAGE_API_KEY ? "alpha-vantage" : "demo");
  return provider === "alpha-vantage" ? process.env.ALPHA_VANTAGE_API_KEY || null : null;
}

/** Cotizaciones para una lista de símbolos del catálogo. Nunca lanza: cae a datos demo marcados. */
export async function getQuotes(symbols: string[]): Promise<MarketQuote[]> {
  const assets = symbols.map(findAsset).filter((a): a is Asset => Boolean(a));
  const crypto = assets.filter((a) => a.coingeckoId);
  const stocks = assets.filter((a) => !a.coingeckoId);
  const results = new Map<string, MarketQuote>();

  if (crypto.length) {
    try {
      for (const q of await coingeckoQuotes(crypto)) results.set(q.symbol, q);
    } catch (error) {
      console.warn("[market] CoinGecko no disponible:", (error as Error).message);
    }
  }
  const apiKey = stockProviderKey();
  if (apiKey && stocks.length) {
    // El plan gratuito permite pocas solicitudes por minuto: se consultan en serie y con caché.
    for (const asset of stocks.slice(0, 5)) {
      try {
        results.set(asset.symbol, await alphaQuote(asset, apiKey));
      } catch (error) {
        console.warn(`[market] Alpha Vantage ${asset.symbol}:`, (error as Error).message);
      }
    }
  }
  return assets.map((a) => results.get(a.symbol) ?? demoQuote(a));
}

export async function getHistory(symbol: string, days = 120): Promise<PriceHistory | null> {
  const asset = findAsset(symbol);
  if (!asset) return null;
  try {
    if (asset.coingeckoId) return await coingeckoHistory(asset, days);
    const apiKey = stockProviderKey();
    if (apiKey) return await alphaHistory(asset, apiKey);
  } catch (error) {
    console.warn(`[market] Historial ${symbol} no disponible:`, (error as Error).message);
  }
  return { symbol: asset.symbol, points: demoHistory(asset, days), source: "Demo", isDemo: true };
}

export type Indicators = {
  last: number;
  return30d: number | null;
  return90d: number | null;
  sma20: number | null;
  sma50: number | null;
  rsi14: number | null;
  volatilityAnnual: number | null;
  maxDrawdown: number | null;
  trend: "alcista" | "bajista" | "lateral" | "sin datos";
  observations: number;
};

export function computeIndicators(points: PricePoint[], periodsPerYear = 252): Indicators {
  const closes = points.map((p) => p.close);
  const n = closes.length;
  const last = closes[n - 1] ?? 0;
  const ret = (days: number) => (n > days ? ((last - closes[n - 1 - days]) / closes[n - 1 - days]) * 100 : null);
  const sma = (k: number) => (n >= k ? closes.slice(-k).reduce((a, b) => a + b, 0) / k : null);

  let rsi14: number | null = null;
  if (n > 15) {
    let gains = 0;
    let losses = 0;
    for (let i = n - 14; i < n; i++) {
      const d = closes[i] - closes[i - 1];
      if (d >= 0) gains += d;
      else losses -= d;
    }
    rsi14 = losses === 0 ? 100 : 100 - 100 / (1 + gains / 14 / (losses / 14));
  }

  let volatilityAnnual: number | null = null;
  if (n > 20) {
    const logs = closes.slice(1).map((c, i) => Math.log(c / closes[i]));
    const mean = logs.reduce((a, b) => a + b, 0) / logs.length;
    const variance = logs.reduce((a, b) => a + (b - mean) ** 2, 0) / (logs.length - 1);
    volatilityAnnual = Math.sqrt(variance) * Math.sqrt(periodsPerYear) * 100;
  }

  let peak = closes[0] ?? 0;
  let maxDrawdown = 0;
  for (const c of closes) {
    peak = Math.max(peak, c);
    maxDrawdown = Math.min(maxDrawdown, (c - peak) / peak);
  }

  const sma20 = sma(20);
  const sma50 = sma(50);
  let trend: Indicators["trend"] = "sin datos";
  if (sma20 && sma50) trend = sma20 > sma50 * 1.01 && last > sma20 ? "alcista" : sma20 < sma50 * 0.99 && last < sma20 ? "bajista" : "lateral";

  return {
    last,
    return30d: ret(30),
    return90d: ret(90),
    sma20,
    sma50,
    rsi14,
    volatilityAnnual,
    maxDrawdown: n ? maxDrawdown * 100 : null,
    trend,
    observations: n,
  };
}

export async function getAssetSnapshot(symbol: string) {
  const asset = findAsset(symbol);
  if (!asset) return null;
  const [quotes, history] = await Promise.all([getQuotes([asset.symbol]), getHistory(asset.symbol)]);
  const indicators = history ? computeIndicators(history.points, asset.type === "cripto" ? 365 : 252) : null;
  return { asset, quote: quotes[0], history, indicators };
}

// --- Compatibilidad con /api/market y MarketBoard (watchlist inicial de la portada) ---
const WATCHLIST = ["NVDA", "TSLA", "MSFT"];

export async function getMarketQuotes() {
  const quotes = await getQuotes(WATCHLIST);
  return {
    provider: quotes.every((q) => q.isDemo) ? "demo" : quotes[0]?.source ?? "demo",
    quotes,
    isDemo: quotes.every((quote) => quote.isDemo),
    warning: null as string | null,
  };
}

export const MARKET_OVERVIEW_SYMBOLS = ["SPY", "QQQ", "DIA", "BND", "BTC", "ETH"];

export function marketProviderStatus() {
  return {
    crypto: "CoinGecko (público)",
    stocks: stockProviderKey() ? "Alpha Vantage" : "Demostración (configura ALPHA_VANTAGE_API_KEY)",
  };
}

export { ASSETS };
