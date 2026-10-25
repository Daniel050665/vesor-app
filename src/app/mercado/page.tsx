import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { ASSETS, ASSET_TYPE_LABEL, type AssetType } from "@/lib/assets";
import { getQuotes, marketProviderStatus } from "@/lib/market-data";
import { INTERESTS } from "@/lib/validation";
import { AssetCard } from "@/components/AssetCards";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mercado — Vesor" };

type Search = { tipo?: string; tema?: string; mios?: string; q?: string };

function href(current: Search, patch: Partial<Search>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...current, ...patch })) if (v) params.set(k, v);
  const s = params.toString();
  return s ? `/mercado?${s}` : "/mercado";
}

export default async function MercadoPage({ searchParams }: { searchParams: Search }) {
  const user = await requireUser("/mercado");
  const watch = new Set((await query<{ symbol: string }>(`select symbol from watchlist where user_id = $1`, [user.id])).map((w) => w.symbol));
  const q = (searchParams.q ?? "").trim().toLowerCase();

  const assets = ASSETS.filter((a) => {
    if (searchParams.tipo && a.type !== searchParams.tipo) return false;
    if (searchParams.tema && !a.interests.includes(searchParams.tema as never)) return false;
    if (searchParams.mios && !a.interests.some((i) => user.interests.includes(i))) return false;
    if (q && !`${a.symbol} ${a.name} ${a.sector}`.toLowerCase().includes(q)) return false;
    return true;
  });
  const quotes = await getQuotes(assets.map((a) => a.symbol));
  const quoteOf = new Map(quotes.map((x) => [x.symbol, x]));
  const providers = marketProviderStatus();

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="eyebrow">Mercado</p>
          <h1>Activos para analizar</h1>
          <p className="muted">Acciones: {providers.stocks}. Criptomonedas: {providers.crypto}. Cada precio indica su fuente.</p>
        </div>
        <form className="filters" action="/mercado" style={{ margin: 0 }}>
          {searchParams.tipo && <input type="hidden" name="tipo" value={searchParams.tipo} />}
          {searchParams.tema && <input type="hidden" name="tema" value={searchParams.tema} />}
          <input name="q" defaultValue={searchParams.q} placeholder="Buscar símbolo o empresa" aria-label="Buscar activo" style={{ width: 230 }} />
        </form>
      </div>

      <div className="filters">
        <Link href={href(searchParams, { tipo: undefined })} className={`toggle ${!searchParams.tipo ? "on" : ""}`}>Todos</Link>
        {(Object.keys(ASSET_TYPE_LABEL) as AssetType[]).map((t) => (
          <Link key={t} href={href(searchParams, { tipo: t })} className={`toggle ${searchParams.tipo === t ? "on" : ""}`}>{ASSET_TYPE_LABEL[t]}s</Link>
        ))}
      </div>
      <div className="filters">
        <Link href={href(searchParams, { mios: searchParams.mios ? undefined : "1", tema: undefined })} className={`toggle ${searchParams.mios ? "on" : ""}`}>★ Mis intereses</Link>
        {INTERESTS.map((i) => (
          <Link key={i.value} href={href(searchParams, { tema: searchParams.tema === i.value ? undefined : i.value, mios: undefined })} className={`toggle ${searchParams.tema === i.value ? "on" : ""}`}>
            {i.label}
          </Link>
        ))}
      </div>

      {assets.length === 0 ? (
        <div className="empty">No hay activos con esos filtros. <Link href="/mercado">Quitar filtros</Link></div>
      ) : (
        <div className="grid-3">
          {assets.map((a) => <AssetCard key={a.symbol} asset={a} quote={quoteOf.get(a.symbol)} watching={watch.has(a.symbol)} />)}
        </div>
      )}
      <p className="footer-note">Los precios marcados como «Demo» son simulados y no deben usarse como cotizaciones reales.</p>
    </div>
  );
}
