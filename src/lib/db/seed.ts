import { hashPassword } from "../password";
import { normalizeEmail, validateEmail, validatePassword } from "../validation";

type QueryFn = <T>(sql: string, params?: unknown[]) => Promise<T[]>;

// Fuentes RSS públicas que permiten enlazar sus titulares con atribución.
// Solo se guardan título, resumen corto, fecha y enlace; el contenido completo se lee en la fuente original.
export const DEFAULT_NEWS_SOURCES = [
  { name: "Yahoo Finance · Mercados", provider: "Yahoo Finance", category: "mercados", url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC,SPY,QQQ,DIA&region=US&lang=en-US" },
  { name: "Yahoo Finance · Tecnología e IA", provider: "Yahoo Finance", category: "tecnologia", url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=NVDA,MSFT,AAPL,AMD,TSM&region=US&lang=en-US" },
  { name: "Yahoo Finance · Criptomonedas", provider: "Yahoo Finance", category: "cripto", url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=BTC-USD,ETH-USD,SOL-USD&region=US&lang=en-US" },
  { name: "Yahoo Finance · Energía", provider: "Yahoo Finance", category: "energia", url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=XOM,CVX,NEE,ENPH,XLE&region=US&lang=en-US" },
  { name: "Yahoo Finance · Salud", provider: "Yahoo Finance", category: "salud", url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=JNJ,PFE,LLY,MRNA,XLV&region=US&lang=en-US" },
  { name: "Yahoo Finance · Finanzas y pagos", provider: "Yahoo Finance", category: "finanzas", url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=JPM,BAC,V,MA,PYPL&region=US&lang=en-US" },
  { name: "CNBC · Economía", provider: "CNBC", category: "economia", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258" },
  { name: "CNBC · Finanzas", provider: "CNBC", category: "finanzas", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664" },
  { name: "CNBC · Tecnología", provider: "CNBC", category: "tecnologia", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=19854910" },
  { name: "CoinDesk", provider: "CoinDesk", category: "cripto", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { name: "Cointelegraph", provider: "Cointelegraph", category: "cripto", url: "https://cointelegraph.com/rss" },
  { name: "MarketWatch · Principales", provider: "MarketWatch", category: "mercados", url: "https://feeds.content.dowjones.io/public/rss/mw_topstories" },
  { name: "Reserva Federal · Comunicados", provider: "Federal Reserve", category: "economia", url: "https://www.federalreserve.gov/feeds/press_all.xml" },
  { name: "TechCrunch · Fintech", provider: "TechCrunch", category: "tecnologia", url: "https://techcrunch.com/category/fintech/feed/" },
  { name: "OilPrice · Energía", provider: "OilPrice.com", category: "energia", url: "https://oilprice.com/rss/main" },
];

async function seedNewsSources(query: QueryFn) {
  for (const s of DEFAULT_NEWS_SOURCES) {
    await query(
      `insert into news_sources (name, url, category, provider) values ($1, $2, $3, $4) on conflict (url) do nothing`,
      [s.name, s.url, s.category, s.provider]
    );
  }
}

type SeedAccount = {
  role: "admin" | "user";
  email?: string;
  password?: string;
  name: string;
  experience: string;
  interests: string[];
  risk: string;
  goal: string;
  horizon: string;
};

// Cuentas de prueba: solo se crean si las variables SEED_* están definidas (nunca valores fijos en el código).
async function seedAccounts(query: QueryFn) {
  const accounts: SeedAccount[] = [
    {
      role: "admin",
      email: process.env.SEED_ADMIN_EMAIL,
      password: process.env.SEED_ADMIN_PASSWORD,
      name: "Administración Vesor",
      experience: "avanzado",
      interests: ["mercado_general", "finanzas"],
      risk: "media",
      goal: "aprender",
      horizon: "medio",
    },
    {
      role: "user",
      email: process.env.SEED_USER_EMAIL,
      password: process.env.SEED_USER_PASSWORD,
      name: "Laura Gómez Ríos",
      experience: "principiante",
      interests: ["tecnologia", "ia", "cripto"],
      risk: "media",
      goal: "ahorro_largo_plazo",
      horizon: "largo",
    },
  ];
  const isProduction = process.env.NODE_ENV === "production";
  const allowProduction = process.env.ALLOW_PRODUCTION_SEED === "true";

  for (const account of accounts) {
    if (!account.email || !account.password) continue;
    if (isProduction && !allowProduction) {
      console.warn(`[seed] Omitida la cuenta ${account.role}: define ALLOW_PRODUCTION_SEED=true para inicializar en producción.`);
      continue;
    }
    const email = normalizeEmail(account.email);
    const problem = validateEmail(email) || validatePassword(account.password);
    if (problem) {
      console.warn(`[seed] Cuenta ${account.role} no creada: ${problem}`);
      continue;
    }
    const existing = await query<{ id: string }>(`select id from app_users where email = $1`, [email]);
    if (existing.length) {
      // No se sobrescribe la contraseña existente; solo se garantiza el rol esperado.
      await query(`update app_users set role = $2 where id = $1`, [existing[0].id, account.role]);
      if (process.env.SEED_RESET_PASSWORDS === "true") {
        await query(`update app_users set password_hash = $2, status = 'active' where id = $1`, [
          existing[0].id,
          await hashPassword(account.password),
        ]);
      }
      continue;
    }
    await query(
      `insert into app_users (email, password_hash, full_name, birth_date, role, experience, interests, risk_tolerance, goal, horizon)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)`,
      [
        email,
        await hashPassword(account.password),
        account.name,
        "1995-06-15",
        account.role,
        account.experience,
        JSON.stringify(account.interests),
        account.risk,
        account.goal,
        account.horizon,
      ]
    );
    console.info(`[seed] Cuenta de prueba ${account.role} creada: ${email}`);
  }
}

export async function seedDatabase(query: QueryFn) {
  await seedNewsSources(query);
  await seedAccounts(query);
}
