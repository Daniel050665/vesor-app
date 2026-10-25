import { ASSETS, VOLATILITY_INFO, type Asset } from "./assets";
import { interestLabel } from "./validation";

export type ProfileForRecs = {
  experience: "principiante" | "intermedio" | "avanzado";
  interests: string[];
  risk_tolerance: "baja" | "media" | "alta" | null;
  horizon: string | null;
  goal: string | null;
};

export type Recommendation = {
  asset: Asset;
  score: number;
  reasons: string[];
  cautions: string[];
  fit: "adecuado" | "con precaución" | "solo para aprender";
};

/** Categoría de noticias asociada a cada interés del usuario. */
export const INTEREST_NEWS_CATEGORIES: Record<string, string[]> = {
  tecnologia: ["tecnologia"],
  ia: ["tecnologia"],
  cripto: ["cripto"],
  energia: ["energia"],
  salud: ["salud"],
  finanzas: ["finanzas"],
  mercado_general: ["mercados", "economia"],
};

export function newsCategoriesFor(interests: string[]) {
  return Array.from(new Set(interests.flatMap((i) => INTEREST_NEWS_CATEGORIES[i] ?? [])));
}

/**
 * Ideas para explorar (no órdenes de compra). El puntaje combina afinidad con los intereses,
 * compatibilidad con la tolerancia al riesgo y el nivel de experiencia, horizonte y diversificación.
 * Un activo no se sugiere solo por ser popular o por pertenecer a la categoría de interés.
 */
export function recommendAssets(profile: ProfileForRecs, watchlist: string[], limit = 6): Recommendation[] {
  const tolerance = profile.risk_tolerance ?? (profile.experience === "principiante" ? "baja" : "media");
  const shortHorizon = profile.horizon === "corto";
  const watchedCategories = new Map<string, number>();
  for (const symbol of watchlist) {
    const asset = ASSETS.find((a) => a.symbol === symbol);
    asset?.interests.forEach((i) => watchedCategories.set(i, (watchedCategories.get(i) ?? 0) + 1));
  }

  const recs: Recommendation[] = [];
  for (const asset of ASSETS) {
    if (watchlist.includes(asset.symbol)) continue;
    const reasons: string[] = [];
    const cautions: string[] = [];
    let score = 0;

    const matched = asset.interests.filter((i) => profile.interests.includes(i));
    if (matched.length) {
      score += 2 + matched.length * 0.5;
      reasons.push(`Relacionado con tu interés en ${matched.map(interestLabel).join(" y ").toLowerCase()}.`);
    }

    // Compatibilidad con la tolerancia al riesgo.
    const volRank = { baja: 0, media: 1, alta: 2 }[asset.volatility];
    const tolRank = { baja: 0, media: 1, alta: 2 }[tolerance];
    if (volRank <= tolRank) {
      score += 1.5;
      reasons.push(`Su ${VOLATILITY_INFO[asset.volatility].label.toLowerCase()} es coherente con tu tolerancia al riesgo ${tolerance}.`);
    } else {
      score -= (volRank - tolRank) * 2;
      cautions.push(`Es más volátil de lo que indica tu tolerancia al riesgo (${tolerance}).`);
    }

    // Experiencia: los principiantes se benefician de instrumentos diversificados.
    if (asset.type === "etf") {
      score += profile.experience === "principiante" ? 1.5 : 0.5;
      reasons.push("Al ser un ETF reparte el riesgo entre muchas empresas.");
    } else if (asset.type === "cripto" && profile.experience === "principiante") {
      score -= 1;
      cautions.push("Las criptomonedas requieren entender custodia, comisiones y caídas muy fuertes.");
    } else if (asset.type === "accion" && profile.experience === "principiante") {
      cautions.push("Una sola empresa concentra el riesgo: compárala con un ETF del mismo sector.");
    }

    if (shortHorizon && asset.volatility === "alta") {
      score -= 1.5;
      cautions.push("Con un horizonte menor a un año, una caída fuerte puede no alcanzar a recuperarse.");
    }
    if (profile.goal === "ingresos" && ["JNJ", "XOM", "CVX", "BND", "NEE", "JPM"].includes(asset.symbol)) {
      score += 0.5;
      reasons.push("Históricamente ha pagado dividendos o intereses, útil para tu objetivo de ingresos.");
    }

    // Diversificación: si la lista de seguimiento ya está concentrada en un tema, se favorecen otros.
    const overlap = asset.interests.reduce((acc, i) => acc + (watchedCategories.get(i) ?? 0), 0);
    if (overlap >= 3) {
      score -= 1;
      cautions.push("Tu lista de seguimiento ya tiene varios activos de este tema.");
    }
    if (asset.interests.includes("mercado_general") && watchlist.length >= 3 && overlap === 0) {
      score += 1;
      reasons.push("Ayuda a diversificar frente a los activos que ya sigues.");
    }

    if (!matched.length && !asset.interests.includes("mercado_general")) continue;
    cautions.push(VOLATILITY_INFO[asset.volatility].loss);
    const fit: Recommendation["fit"] =
      volRank > tolRank + 1 ? "solo para aprender" : volRank > tolRank || cautions.length > 2 ? "con precaución" : "adecuado";
    recs.push({ asset, score, reasons, cautions, fit });
  }

  return recs.sort((a, b) => b.score - a.score || a.asset.symbol.localeCompare(b.asset.symbol)).slice(0, limit);
}
