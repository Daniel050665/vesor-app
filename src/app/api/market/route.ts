import { NextResponse } from "next/server";
import { getMarketQuotes } from "@/lib/market-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getMarketQuotes());
  } catch {
    return NextResponse.json(
      { error: "No pudimos consultar las cotizaciones en este momento." },
      { status: 502 }
    );
  }
}
