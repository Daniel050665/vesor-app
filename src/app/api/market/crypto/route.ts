import { NextResponse } from "next/server";
import { ASSETS } from "@/lib/assets";
import { getQuotes } from "@/lib/market-data";

export const dynamic = "force-dynamic";

// Cotizaciones de todas las criptomonedas del catálogo (CoinGecko, con caché de 2 minutos en el servidor).
export async function GET() {
  const quotes = await getQuotes(ASSETS.filter((a) => a.coingeckoId).map((a) => a.symbol));
  return NextResponse.json(
    { quotes, updatedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
