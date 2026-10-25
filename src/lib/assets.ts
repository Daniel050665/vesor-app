import type { Interest } from "./validation";

export type AssetType = "accion" | "etf" | "cripto";
export type Volatility = "baja" | "media" | "alta";

export type Asset = {
  symbol: string;
  name: string;
  type: AssetType;
  sector: string;
  interests: Interest[];
  volatility: Volatility;
  description: string;
  risks: string;
  /** Precio de referencia usado SOLO para los datos de demostración. */
  demoPrice: number;
  coingeckoId?: string;
  aliases?: string[];
};

export const ASSET_TYPE_LABEL: Record<AssetType, string> = { accion: "Acción", etf: "ETF", cripto: "Criptomoneda" };

export const VOLATILITY_INFO: Record<Volatility, { label: string; loss: string }> = {
  baja: { label: "Volatilidad baja", loss: "En mercados adversos puede caer entre 10% y 20%." },
  media: { label: "Volatilidad media", loss: "En mercados adversos puede caer entre 20% y 40%." },
  alta: { label: "Volatilidad alta", loss: "Puede caer más de 50% en periodos adversos e incluso perder la mayor parte de su valor." },
};

export const ASSETS: Asset[] = [
  // Mercado general
  { symbol: "SPY", name: "SPDR S&P 500 ETF", type: "etf", sector: "Índice EE. UU. (S&P 500)", interests: ["mercado_general"], volatility: "baja", demoPrice: 580, description: "Replica las 500 empresas más grandes de EE. UU.; diversifica en un solo instrumento.", risks: "Sigue las caídas generales del mercado; concentración creciente en grandes tecnológicas.", aliases: ["s&p 500", "sp500", "s&p"] },
  { symbol: "VT", name: "Vanguard Total World Stock ETF", type: "etf", sector: "Acciones globales", interests: ["mercado_general"], volatility: "baja", demoPrice: 120, description: "Exposición a miles de empresas de mercados desarrollados y emergentes.", risks: "Riesgo cambiario y de mercado global; no protege en crisis generalizadas." },
  { symbol: "DIA", name: "SPDR Dow Jones Industrial Average ETF", type: "etf", sector: "Índice EE. UU. (Dow Jones)", interests: ["mercado_general"], volatility: "baja", demoPrice: 425, description: "Sigue a 30 grandes empresas industriales y de servicios de EE. UU.", risks: "Pocas empresas y ponderado por precio; menos diversificado que el S&P 500.", aliases: ["dow jones"] },
  { symbol: "QQQ", name: "Invesco QQQ (Nasdaq-100)", type: "etf", sector: "Índice tecnológico Nasdaq-100", interests: ["mercado_general", "tecnologia"], volatility: "media", demoPrice: 500, description: "Las 100 mayores empresas no financieras del Nasdaq, con fuerte peso tecnológico.", risks: "Alta concentración en tecnología; caídas mayores que el mercado en correcciones.", aliases: ["nasdaq"] },
  { symbol: "BND", name: "Vanguard Total Bond Market ETF", type: "etf", sector: "Bonos EE. UU.", interests: ["mercado_general", "finanzas"], volatility: "baja", demoPrice: 73, description: "Bonos de grado de inversión de EE. UU.; suele moverse menos que las acciones.", risks: "Pierde valor cuando suben las tasas de interés; rendimiento esperado menor.", aliases: ["bonos"] },
  // Tecnología e IA
  { symbol: "AAPL", name: "Apple", type: "accion", sector: "Tecnología de consumo", interests: ["tecnologia"], volatility: "media", demoPrice: 228, description: "Fabricante del iPhone con un negocio creciente de servicios.", risks: "Dependencia del iPhone, regulación de su tienda de aplicaciones y cadena de suministro en Asia.", aliases: ["apple"] },
  { symbol: "MSFT", name: "Microsoft", type: "accion", sector: "Software y nube", interests: ["tecnologia", "ia"], volatility: "media", demoPrice: 513, description: "Software empresarial, nube Azure e inversiones en inteligencia artificial.", risks: "Valoración exigente; competencia en la nube y escrutinio regulatorio.", aliases: ["microsoft"] },
  { symbol: "GOOGL", name: "Alphabet (Google)", type: "accion", sector: "Internet y publicidad", interests: ["tecnologia", "ia"], volatility: "media", demoPrice: 165, description: "Buscador, YouTube, nube y desarrollo de modelos de IA.", risks: "Dependencia de la publicidad, litigios antimonopolio y competencia en búsqueda con IA.", aliases: ["google", "alphabet"] },
  { symbol: "AMZN", name: "Amazon", type: "accion", sector: "Comercio electrónico y nube", interests: ["tecnologia"], volatility: "media", demoPrice: 186, description: "Comercio electrónico y AWS, la mayor nube pública.", risks: "Márgenes estrechos en comercio, inversión intensiva y regulación.", aliases: ["amazon"] },
  { symbol: "META", name: "Meta Platforms", type: "accion", sector: "Redes sociales", interests: ["tecnologia", "ia"], volatility: "alta", demoPrice: 560, description: "Facebook, Instagram y WhatsApp; fuerte inversión en IA y realidad virtual.", risks: "Dependencia publicitaria, privacidad de datos y gasto elevado en proyectos de largo plazo.", aliases: ["meta", "facebook"] },
  { symbol: "NVDA", name: "NVIDIA", type: "accion", sector: "Semiconductores e IA", interests: ["tecnologia", "ia"], volatility: "alta", demoPrice: 187, description: "Líder en chips para centros de datos e inteligencia artificial.", risks: "Expectativas muy altas, concentración de clientes, ciclos de semiconductores y restricciones de exportación.", aliases: ["nvidia"] },
  { symbol: "AMD", name: "AMD", type: "accion", sector: "Semiconductores", interests: ["tecnologia", "ia"], volatility: "alta", demoPrice: 160, description: "Procesadores y aceleradores para PC, servidores e IA.", risks: "Competencia intensa con NVIDIA e Intel; ciclos de demanda de chips." },
  { symbol: "TSM", name: "TSMC", type: "accion", sector: "Fabricación de semiconductores", interests: ["tecnologia", "ia"], volatility: "media", demoPrice: 190, description: "Mayor fabricante de chips por contrato del mundo.", risks: "Riesgo geopolítico en Taiwán y alta inversión de capital.", aliases: ["tsmc"] },
  { symbol: "SMH", name: "VanEck Semiconductor ETF", type: "etf", sector: "ETF de semiconductores", interests: ["tecnologia", "ia"], volatility: "alta", demoPrice: 250, description: "Cesta de los principales fabricantes y diseñadores de chips.", risks: "Sector cíclico y concentrado; caídas pronunciadas en correcciones tecnológicas." },
  { symbol: "BOTZ", name: "Global X Robotics & AI ETF", type: "etf", sector: "ETF de robótica e IA", interests: ["ia", "tecnologia"], volatility: "media", demoPrice: 32, description: "Empresas de robótica, automatización e inteligencia artificial.", risks: "Temática concentrada; empresas con valoraciones sensibles a las tasas de interés." },
  { symbol: "TSLA", name: "Tesla", type: "accion", sector: "Automoción y energía", interests: ["tecnologia", "energia"], volatility: "alta", demoPrice: 382, description: "Vehículos eléctricos, almacenamiento de energía y conducción autónoma.", risks: "Valoración muy dependiente de expectativas, competencia creciente y riesgo de liderazgo.", aliases: ["tesla"] },
  // Cripto
  { symbol: "BTC", name: "Bitcoin", type: "cripto", sector: "Criptoactivo", interests: ["cripto"], volatility: "alta", demoPrice: 67000, coingeckoId: "bitcoin", description: "La primera y mayor criptomoneda por capitalización.", risks: "Volatilidad extrema, regulación cambiante, custodia y riesgo de pérdida de llaves.", aliases: ["bitcoin"] },
  { symbol: "ETH", name: "Ethereum", type: "cripto", sector: "Criptoactivo / plataforma", interests: ["cripto", "tecnologia"], volatility: "alta", demoPrice: 2600, coingeckoId: "ethereum", description: "Plataforma de contratos inteligentes y aplicaciones descentralizadas.", risks: "Volatilidad extrema, riesgo tecnológico y competencia de otras cadenas.", aliases: ["ethereum", "ether"] },
  { symbol: "SOL", name: "Solana", type: "cripto", sector: "Criptoactivo / plataforma", interests: ["cripto"], volatility: "alta", demoPrice: 150, coingeckoId: "solana", description: "Cadena de bloques enfocada en transacciones rápidas y baratas.", risks: "Mayor riesgo que Bitcoin; historial de interrupciones de red y alta especulación.", aliases: ["solana"] },
  { symbol: "ADA", name: "Cardano", type: "cripto", sector: "Criptoactivo / plataforma", interests: ["cripto"], volatility: "alta", demoPrice: 0.35, coingeckoId: "cardano", description: "Plataforma de contratos inteligentes con desarrollo basado en investigación.", risks: "Adopción incierta y alta volatilidad.", aliases: ["cardano"] },
  // Energía
  { symbol: "XOM", name: "ExxonMobil", type: "accion", sector: "Petróleo y gas", interests: ["energia"], volatility: "media", demoPrice: 118, description: "Una de las mayores petroleras integradas del mundo.", risks: "Precio del petróleo, transición energética y regulación ambiental.", aliases: ["exxon"] },
  { symbol: "CVX", name: "Chevron", type: "accion", sector: "Petróleo y gas", interests: ["energia"], volatility: "media", demoPrice: 155, description: "Petrolera integrada con dividendos históricamente estables.", risks: "Ciclo del crudo y riesgos operativos.", aliases: ["chevron"] },
  { symbol: "NEE", name: "NextEra Energy", type: "accion", sector: "Energía renovable y servicios públicos", interests: ["energia"], volatility: "media", demoPrice: 75, description: "Gran generador de energía eólica y solar en EE. UU.", risks: "Sensible a las tasas de interés y a cambios en incentivos regulatorios." },
  { symbol: "ENPH", name: "Enphase Energy", type: "accion", sector: "Tecnología solar", interests: ["energia", "tecnologia"], volatility: "alta", demoPrice: 70, description: "Microinversores para instalaciones solares residenciales.", risks: "Demanda cíclica, competencia y dependencia de subsidios." },
  { symbol: "XLE", name: "Energy Select Sector SPDR", type: "etf", sector: "ETF de energía", interests: ["energia"], volatility: "media", demoPrice: 90, description: "Grandes empresas energéticas del S&P 500.", risks: "Concentrado en petróleo y gas; depende del precio de las materias primas." },
  { symbol: "ICLN", name: "iShares Global Clean Energy ETF", type: "etf", sector: "ETF de energía limpia", interests: ["energia"], volatility: "alta", demoPrice: 14, description: "Empresas globales de energía renovable.", risks: "Muy sensible a tasas de interés y políticas públicas." },
  { symbol: "EC", name: "Ecopetrol", type: "accion", sector: "Petróleo y gas (Colombia)", interests: ["energia"], volatility: "alta", demoPrice: 9.8, description: "Principal petrolera de Colombia, con participación estatal.", risks: "Precio del petróleo, riesgo político/regulatorio local y tasa de cambio.", aliases: ["ecopetrol"] },
  // Salud
  { symbol: "JNJ", name: "Johnson & Johnson", type: "accion", sector: "Farmacéutica y dispositivos", interests: ["salud"], volatility: "baja", demoPrice: 160, description: "Medicamentos y dispositivos médicos diversificados.", risks: "Litigios, vencimiento de patentes y presión regulatoria sobre precios." },
  { symbol: "PFE", name: "Pfizer", type: "accion", sector: "Farmacéutica", interests: ["salud"], volatility: "media", demoPrice: 28, description: "Farmacéutica global con portafolio de vacunas y medicamentos.", risks: "Caída de ingresos post-pandemia y vencimiento de patentes.", aliases: ["pfizer"] },
  { symbol: "LLY", name: "Eli Lilly", type: "accion", sector: "Farmacéutica", interests: ["salud"], volatility: "media", demoPrice: 800, description: "Farmacéutica con fuerte crecimiento en tratamientos para diabetes y obesidad.", risks: "Valoración exigente y dependencia de pocos medicamentos." },
  { symbol: "MRNA", name: "Moderna", type: "accion", sector: "Biotecnología", interests: ["salud"], volatility: "alta", demoPrice: 40, description: "Biotecnológica basada en tecnología de ARN mensajero.", risks: "Resultados clínicos binarios, ingresos concentrados y quema de caja." },
  { symbol: "MDT", name: "Medtronic", type: "accion", sector: "Dispositivos médicos", interests: ["salud"], volatility: "baja", demoPrice: 88, description: "Fabricante global de dispositivos médicos.", risks: "Aprobaciones regulatorias y competencia." },
  { symbol: "XLV", name: "Health Care Select Sector SPDR", type: "etf", sector: "ETF de salud", interests: ["salud"], volatility: "baja", demoPrice: 145, description: "Grandes empresas de salud del S&P 500.", risks: "Cambios en políticas de precios de medicamentos." },
  // Finanzas
  { symbol: "JPM", name: "JPMorgan Chase", type: "accion", sector: "Banca", interests: ["finanzas"], volatility: "media", demoPrice: 220, description: "Mayor banco de EE. UU. por activos.", risks: "Ciclo económico, calidad del crédito y regulación bancaria." },
  { symbol: "BAC", name: "Bank of America", type: "accion", sector: "Banca", interests: ["finanzas"], volatility: "media", demoPrice: 42, description: "Banco comercial y de inversión estadounidense.", risks: "Sensibilidad a tasas de interés y morosidad." },
  { symbol: "V", name: "Visa", type: "accion", sector: "Pagos", interests: ["finanzas", "tecnologia"], volatility: "baja", demoPrice: 290, description: "Red global de pagos con tarjeta.", risks: "Regulación de comisiones y competencia de nuevos medios de pago.", aliases: ["visa"] },
  { symbol: "MA", name: "Mastercard", type: "accion", sector: "Pagos", interests: ["finanzas", "tecnologia"], volatility: "baja", demoPrice: 500, description: "Red global de pagos electrónicos.", risks: "Regulación y competencia en pagos digitales.", aliases: ["mastercard"] },
  { symbol: "PYPL", name: "PayPal", type: "accion", sector: "Pagos digitales", interests: ["finanzas", "tecnologia"], volatility: "alta", demoPrice: 70, description: "Plataforma de pagos en línea y billeteras digitales.", risks: "Competencia fuerte en fintech y crecimiento desacelerado.", aliases: ["paypal"] },
  { symbol: "XLF", name: "Financial Select Sector SPDR", type: "etf", sector: "ETF financiero", interests: ["finanzas"], volatility: "media", demoPrice: 47, description: "Bancos, aseguradoras y servicios financieros del S&P 500.", risks: "Depende del ciclo económico y de las tasas de interés." },
];

export const ASSET_BY_SYMBOL = new Map(ASSETS.map((a) => [a.symbol, a]));

export function findAsset(symbol: string) {
  return ASSET_BY_SYMBOL.get(symbol.toUpperCase()) ?? null;
}

/** Detecta los activos mencionados en un texto libre (símbolo en mayúsculas o nombre común). */
export function detectAssets(text: string): Asset[] {
  const found = new Set<string>();
  const lower = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  for (const asset of ASSETS) {
    // El símbolo debe aparecer en mayúsculas y aislado; los de una letra (V) solo se detectan por su nombre.
    if (asset.symbol.length > 1 && new RegExp(`(^|[^A-Za-z])\\$?${asset.symbol}([^A-Za-z]|$)`).test(text)) {
      found.add(asset.symbol);
    }
    for (const alias of [asset.name.toLowerCase(), ...(asset.aliases ?? [])]) {
      const a = alias.normalize("NFD").replace(/[̀-ͯ]/g, "");
      if (a.length >= 4 && new RegExp(`(^|[^a-z])${a.replace(/[.*+?^${}()|[\]\\&]/g, "\\$&")}([^a-z]|$)`).test(lower)) found.add(asset.symbol);
    }
  }
  return Array.from(found).map((s) => ASSET_BY_SYMBOL.get(s)!);
}
