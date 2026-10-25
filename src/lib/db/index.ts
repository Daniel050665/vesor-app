import { SCHEMA_SQL } from "./schema";
import { seedDatabase } from "./seed";

// Capa mínima de acceso a datos. Con DATABASE_URL se usa PostgreSQL (p. ej. Supabase);
// sin ella se usa PGlite, un PostgreSQL embebido que guarda los datos en .data/pglite.

type Params = unknown[];
type Driver = {
  kind: "postgres" | "pglite";
  query: <T>(sql: string, params?: Params) => Promise<T[]>;
  exec: (sql: string) => Promise<void>;
};

const globalForDb = globalThis as unknown as { __vesorDb?: Promise<Driver> };

async function createDriver(): Promise<Driver> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import("postgres");
    const isLocal = /localhost|127\.0\.0\.1/.test(url);
    const sql = postgres(url, {
      ssl: isLocal ? false : "require",
      max: 5,
      prepare: false, // compatible con el pooler de Supabase (modo transacción)
    });
    return {
      kind: "postgres",
      // postgres.js vuelve a serializar con JSON.stringify los parámetros de tipo json/jsonb. Como la app ya
      // envía JSON en texto, se declara el parámetro como text y se convierte en SQL (evita la doble codificación).
      query: async <T,>(text: string, params: Params = []) =>
        (await sql.unsafe(text.replace(/(\$\d+)::jsonb/g, "$1::text::jsonb"), params as never[])) as unknown as T[],
      exec: async (text: string) => {
        await sql.unsafe(text).simple();
      },
    };
  }

  if (process.env.VERCEL) {
    throw new Error("DATABASE_URL es obligatoria en producción: PGlite no persiste datos en Vercel.");
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { mkdirSync } = await import("node:fs");
  const dataDir = process.env.PGLITE_DATA_DIR || "./.data/pglite";
  mkdirSync(dataDir, { recursive: true });
  const pg = new PGlite(dataDir);
  await pg.waitReady;
  return {
    kind: "pglite",
    query: async <T,>(text: string, params: Params = []) => (await pg.query<T>(text, params)).rows,
    exec: async (text: string) => {
      await pg.exec(text);
    },
  };
}

// Cambia este valor cuando se modifique SCHEMA_SQL para que se vuelva a aplicar.
const SCHEMA_VERSION = "2026-10-25.1";

/**
 * Aplica el esquema solo si la versión guardada es distinta. Así los arranques en frío (p. ej. en Vercel)
 * no ejecutan ALTER TABLE en cada instancia, que toma bloqueos exclusivos y puede frenar otras consultas.
 * El esquema es idempotente, así que si dos instancias lo aplican a la vez el resultado es el mismo.
 */
async function init(): Promise<Driver> {
  const driver = await createDriver();
  await driver.exec(`create table if not exists schema_meta (key text primary key, value text not null)`);
  const current = await driver.query<{ value: string }>(`select value from schema_meta where key = 'version'`);
  if (current[0]?.value !== SCHEMA_VERSION) {
    await driver.exec(SCHEMA_SQL);
    await driver.exec(`alter table schema_meta enable row level security`);
    await driver.query(
      `insert into schema_meta (key, value) values ('version', $1) on conflict (key) do update set value = excluded.value`,
      [SCHEMA_VERSION]
    );
    await seedDatabase(driver.query);
  } else if (process.env.SEED_ADMIN_EMAIL || process.env.SEED_USER_EMAIL) {
    // Las cuentas de prueba pueden configurarse después de crear el esquema.
    await seedDatabase(driver.query);
  }
  return driver;
}

function getDriver() {
  if (!globalForDb.__vesorDb) {
    globalForDb.__vesorDb = init().catch((error) => {
      globalForDb.__vesorDb = undefined;
      throw error;
    });
  }
  return globalForDb.__vesorDb;
}

export async function query<T = Record<string, unknown>>(sql: string, params: Params = []): Promise<T[]> {
  const driver = await getDriver();
  return driver.query<T>(sql, params);
}

export async function queryOne<T = Record<string, unknown>>(sql: string, params: Params = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function databaseKind() {
  return (await getDriver()).kind;
}
