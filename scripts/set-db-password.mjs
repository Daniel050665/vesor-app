// Escribe la contraseña de la base de datos en DATABASE_URL de .env.local sin editar el archivo a mano.
// Uso: node scripts/set-db-password.mjs   (pide la contraseña y la guarda codificada para URL)
import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

const file = new URL("../.env.local", import.meta.url);
const text = readFileSync(file, "utf8");
const line = text.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
if (!line) {
  console.error("No hay una línea DATABASE_URL en .env.local");
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
rl.question("Contraseña de la base de datos de Supabase: ", (answer) => {
  rl.close();
  const password = answer.trim().replace(/^\[(.*)\]$/, "$1");
  if (!password) {
    console.error("No escribiste ninguna contraseña.");
    process.exit(1);
  }
  const updated = line.replace(/^(DATABASE_URL=postgresql:\/\/[^:]+:).*(@[^@]+)$/, (_, start, end) => `${start}${encodeURIComponent(password)}${end}`);
  writeFileSync(file, text.replace(line, updated));
  console.log("\nListo: DATABASE_URL actualizada en .env.local.");
  console.log("Valor para pegar en Vercel (campo Value de DATABASE_URL):\n");
  console.log(updated.slice("DATABASE_URL=".length));
});
