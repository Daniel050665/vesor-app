import Link from "next/link";
import { ASSET_TYPE_LABEL, VOLATILITY_INFO, type Asset } from "@/lib/assets";
import type { MarketQuote } from "@/lib/market-data";
import type { Recommendation } from "@/lib/personalization";
import { pct, usd } from "@/lib/format";
import WatchButton from "./WatchButton";

export function QuoteSource({ quote }: { quote: MarketQuote }) {
  return quote.isDemo ? (
    <span className="demo-note" title="Precio simulado para demostración">Demo</span>
  ) : (
    <span className="real-note" title={quote.updatedAt}>{quote.source}</span>
  );
}

export function AssetCard({ asset, quote, watching }: { asset: Asset; quote?: MarketQuote; watching?: boolean }) {
  return (
    <article className="asset-card">
      <Link href={`/activo/${asset.symbol}`} className="asset-top" style={{ color: "inherit", textDecoration: "none" }}>
        <div>
          <div className="asset-symbol">{asset.symbol}</div>
          <div className="asset-name">{asset.name}</div>
        </div>
        {quote && (
          <div>
            <div className="asset-price">{usd(quote.price)}</div>
            <div className={`asset-change ${quote.changePct !== null && quote.changePct >= 0 ? "up" : "down"}`}>{pct(quote.changePct)}</div>
          </div>
        )}
      </Link>
      <div className="asset-meta">
        <span className="chip">{ASSET_TYPE_LABEL[asset.type]}</span>
        <span className={`chip vol-${asset.volatility}`}>{VOLATILITY_INFO[asset.volatility].label}</span>
        {quote && <QuoteSource quote={quote} />}
        {watching !== undefined && (
          <span style={{ marginLeft: "auto" }}>
            <WatchButton symbol={asset.symbol} watching={watching} compact />
          </span>
        )}
      </div>
    </article>
  );
}

export function RecommendationCard({ rec }: { rec: Recommendation }) {
  const fitClass = `fit fit-${rec.fit.replace(/ /g, "-").normalize("NFD").replace(/[̀-ͯ]/g, "")}`;
  return (
    <article className="rec">
      <div className="asset-top">
        <div>
          <Link href={`/activo/${rec.asset.symbol}`} className="asset-symbol">{rec.asset.symbol}</Link>
          <div className="asset-name">{rec.asset.name} · {ASSET_TYPE_LABEL[rec.asset.type]}</div>
        </div>
        <span className={fitClass}>{rec.fit}</span>
      </div>
      <ul>{rec.reasons.slice(0, 3).map((r) => <li key={r}>{r}</li>)}</ul>
      <ul className="cautions">{rec.cautions.slice(0, 3).map((c) => <li key={c}>{c}</li>)}</ul>
    </article>
  );
}
