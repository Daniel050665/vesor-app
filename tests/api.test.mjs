// Pruebas de extremo a extremo de la API de Vesor.
// Requisitos: servidor en marcha (npm run dev) y variables SEED_* en .env.local.
// Ejecutar: npm test   (BASE_URL opcional, por defecto http://localhost:3000)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3000";

function envFile() {
  const out = {};
  try {
    for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
      const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
      if (m) out[m[1]] = m[2].replace(/^'(.*)'$/, "$1").replace(/^"(.*)"$/, "$1");
    }
  } catch {}
  return { ...out, ...process.env };
}
const env = envFile();

/** Cliente HTTP mínimo con cookies y cabecera Origin (requerida por la protección CSRF). */
function client() {
  let cookie = "";
  return async (path, { method = "GET", body, origin = true, redirect = "manual" } = {}) => {
    const headers = {};
    if (cookie) headers.Cookie = cookie;
    if (origin) headers.Origin = BASE;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const res = await fetch(BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, redirect });
    const set = res.headers.get("set-cookie");
    if (set) {
      const m = /vesor_session=([^;]*)/.exec(set);
      if (m) cookie = m[1] ? `vesor_session=${m[1]}` : "";
    }
    const type = res.headers.get("content-type") || "";
    const data = type.includes("json") ? await res.json() : await res.text();
    return { status: res.status, data, headers: res.headers };
  };
}

const unique = `prueba.${Date.now()}@vesor.test`;
const strongPassword = "Prueba#2026segura";
const validRegistration = {
  full_name: "Ana Prueba Automática",
  email: unique,
  password: strongPassword,
  password_confirm: strongPassword,
  birth_date: "1999-04-10",
  experience: "intermedio",
  interests: ["energia", "salud"],
  goal: "crecimiento",
  horizon: "largo",
  risk_tolerance: "baja",
  accept_terms: true,
};

test("rutas privadas redirigen al login sin sesión", async () => {
  const http = client();
  for (const path of ["/panel", "/chat", "/historial", "/admin"]) {
    const res = await http(path);
    assert.equal(res.status, 307, path);
    assert.match(res.headers.get("location"), /\/login\?next=/);
  }
});

test("registro valida datos y rechaza duplicados", async () => {
  const http = client();
  const bad = await http("/api/auth/register", { method: "POST", body: { ...validRegistration, password: "corta", birth_date: "2015-01-01", interests: [] } });
  assert.equal(bad.status, 422);
  assert.ok(bad.data.fields.password && bad.data.fields.birth_date && bad.data.fields.interests);

  const ok = await http("/api/auth/register", { method: "POST", body: validRegistration });
  assert.equal(ok.status, 200, JSON.stringify(ok.data));
  assert.equal(ok.data.redirect, "/panel");
  const panel = await http("/panel");
  assert.equal(panel.status, 200);

  const dup = await client()("/api/auth/register", { method: "POST", body: { ...validRegistration, email: unique.toUpperCase() } });
  assert.equal(dup.status, 409);
});

test("sin cabecera Origin se rechazan las mutaciones (CSRF)", async () => {
  const res = await client()("/api/auth/login", { method: "POST", body: { email: "x@y.co", password: "x" }, origin: false });
  assert.equal(res.status, 403);
});

test("inicio de sesión: credenciales incorrectas y cuentas de prueba", async () => {
  const wrong = await client()("/api/auth/login", { method: "POST", body: { email: env.SEED_USER_EMAIL, password: "Incorrecta#999" } });
  assert.equal(wrong.status, 401);
  assert.ok(env.SEED_USER_PASSWORD && env.SEED_ADMIN_PASSWORD, "Faltan SEED_*_PASSWORD en .env.local");
  const user = await client()("/api/auth/login", { method: "POST", body: { email: env.SEED_USER_EMAIL, password: env.SEED_USER_PASSWORD } });
  assert.equal(user.status, 200);
  assert.equal(user.data.redirect, "/panel");
  const admin = await client()("/api/auth/login", { method: "POST", body: { email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD } });
  assert.equal(admin.status, 200);
  assert.equal(admin.data.redirect, "/admin");
});

test("permisos de administrador controlados en el backend", async () => {
  const user = client();
  await user("/api/auth/login", { method: "POST", body: { email: env.SEED_USER_EMAIL, password: env.SEED_USER_PASSWORD } });
  const patch = await user("/api/admin/users/00000000-0000-0000-0000-000000000000", { method: "PATCH", body: { status: "suspended" } });
  assert.equal(patch.status, 403);
  const refresh = await user("/api/admin/news-sources", { method: "PUT" });
  assert.equal(refresh.status, 403);
  const page = await user("/admin");
  assert.equal(page.status, 307);
  assert.match(page.headers.get("location"), /\/panel\?denegado=1/);

  const admin = client();
  await admin("/api/auth/login", { method: "POST", body: { email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD } });
  assert.equal((await admin("/admin")).status, 200);
  assert.equal((await admin("/admin/usuarios")).status, 200);
});

test("funciones del usuario: seguimiento, chat, simulación, noticias, perfil e historial", async () => {
  const http = client();
  await http("/api/auth/register", { method: "POST", body: { ...validRegistration, email: `flujo.${Date.now()}@vesor.test` } });

  // Lista de seguimiento (sin duplicados)
  assert.equal((await http("/api/watchlist", { method: "POST", body: { symbol: "XLE" } })).status, 200);
  assert.equal((await http("/api/watchlist", { method: "POST", body: { symbol: "XLE" } })).status, 200);
  assert.deepEqual((await http("/api/watchlist")).data.symbols, ["XLE"]);
  assert.equal((await http("/api/watchlist", { method: "POST", body: { symbol: "NOEXISTE" } })).status, 404);

  // Chatbot: consulta de activo con indicadores y conversación persistente
  const chat = await http("/api/chat", { method: "POST", body: { message: "Compara SPY con QQQ" } });
  assert.equal(chat.status, 200, JSON.stringify(chat.data));
  assert.ok(chat.data.conversationId);
  assert.deepEqual(chat.data.message.meta.symbols.sort(), ["QQQ", "SPY"]);
  assert.match(chat.data.message.content, /no garantiza|educativ/i);
  const follow = await http("/api/chat", { method: "POST", body: { message: "¿Qué es el RSI?", conversationId: chat.data.conversationId } });
  assert.equal(follow.status, 200);
  const conv = await http(`/api/chat/conversations/${chat.data.conversationId}`);
  assert.equal(conv.data.messages.length, 4);
  assert.equal((await http("/api/chat", { method: "POST", body: { message: "" } })).status, 422);

  // Simulación guardada
  const sim = await http("/api/simulations", { method: "POST", body: { config: { company: "TSLA", context: "Me prometen duplicar en 30 dias, garantizado" } } });
  assert.equal(sim.status, 200);
  assert.equal((await http(`/resultado/${sim.data.id}`)).status, 200);

  // Noticias: abrir (redirige a la fuente) y guardar
  const newsPage = await http("/noticias");
  const id = /\/api\/news\/open\?id=([0-9a-f-]{36})/.exec(newsPage.data)?.[1];
  if (id) {
    const open = await http(`/api/news/open?id=${id}`);
    assert.equal(open.status, 307);
    assert.match(open.headers.get("location"), /^https:\/\//);
    assert.equal((await http("/api/news/saved", { method: "POST", body: { articleId: id } })).status, 200);
  }

  // Preferencias
  const prefs = await http("/api/profile", { method: "PUT", body: { full_name: "Ana Prueba Editada", experience: "avanzado", interests: ["cripto"], risk_tolerance: "alta" } });
  assert.equal(prefs.status, 200);
  assert.equal((await http("/api/profile", { method: "PUT", body: { full_name: "Ana", experience: "experto", interests: [] } })).status, 422);

  // Historial: cada acción quedó registrada una sola vez y en orden cronológico inverso
  const { rows } = (await http("/api/history")).data;
  const types = rows.map((r) => r.type);
  for (const type of ["register", "login", "favorite_add", "chat_query", "analysis", "simulation", "profile_update"]) {
    assert.ok(types.includes(type), `Falta en historial: ${type}`);
  }
  if (id) assert.ok(types.includes("news_open") && types.includes("news_save"));
  assert.equal(rows.filter((r) => r.type === "favorite_add").length, 1, "registro duplicado de seguimiento");
  const times = rows.map((r) => new Date(r.created_at).getTime());
  assert.deepEqual(times, [...times].sort((x, y) => y - x));
  const filtered = (await http("/api/history?tipo=chat_query")).data.rows;
  assert.equal(filtered.length, 2);
  assert.ok(filtered.every((r) => r.type === "chat_query"));
  assert.equal((await http("/historial")).status, 200);
});

test("aislamiento: un usuario no ve conversaciones ni análisis de otro", async () => {
  const a = client();
  await a("/api/auth/register", { method: "POST", body: { ...validRegistration, email: `a.${Date.now()}@vesor.test` } });
  const chat = await a("/api/chat", { method: "POST", body: { message: "Analiza BTC" } });
  const sim = await a("/api/simulations", { method: "POST", body: { config: { company: "NVDA" } } });

  const b = client();
  await b("/api/auth/register", { method: "POST", body: { ...validRegistration, email: `b.${Date.now()}@vesor.test` } });
  assert.equal((await b(`/api/chat/conversations/${chat.data.conversationId}`)).status, 404);
  assert.equal((await b(`/api/chat/conversations/${chat.data.conversationId}`, { method: "DELETE" })).status, 404);
  assert.equal((await b(`/resultado/${sim.data.id}`)).status, 404);
  assert.equal((await b("/api/chat", { method: "POST", body: { message: "hola", conversationId: chat.data.conversationId } })).status, 404);
});

test("recuperación de contraseña y cierre de sesión", async () => {
  const email = `reset.${Date.now()}@vesor.test`;
  const http = client();
  await http("/api/auth/register", { method: "POST", body: { ...validRegistration, email } });
  assert.equal((await http("/api/auth/logout", { method: "POST" })).status, 200);
  assert.equal((await http("/panel")).status, 307);

  const forgot = await client()("/api/auth/forgot", { method: "POST", body: { email } });
  assert.equal(forgot.status, 200);
  const unknown = await client()("/api/auth/forgot", { method: "POST", body: { email: "no.existe@vesor.test" } });
  assert.equal(unknown.data.message, forgot.data.message, "la respuesta no debe revelar si el correo existe");
  assert.ok(forgot.data.devResetUrl, "en desarrollo sin proveedor de correo se devuelve el enlace");
  const token = new URL(forgot.data.devResetUrl).searchParams.get("token");
  const newPassword = "OtraClave#2026x";
  assert.equal((await client()("/api/auth/reset", { method: "POST", body: { token, password: newPassword, password_confirm: newPassword } })).status, 200);
  assert.equal((await client()("/api/auth/reset", { method: "POST", body: { token, password: newPassword, password_confirm: newPassword } })).status, 400, "el enlace es de un solo uso");
  assert.equal((await client()("/api/auth/login", { method: "POST", body: { email, password: newPassword } })).status, 200);
  assert.equal((await client()("/api/auth/login", { method: "POST", body: { email, password: strongPassword } })).status, 401);
});

test("administración: suspender y reactivar una cuenta cierra sus sesiones", async () => {
  const email = `susp.${Date.now()}@vesor.test`;
  const victim = client();
  await victim("/api/auth/register", { method: "POST", body: { ...validRegistration, email } });
  const admin = client();
  await admin("/api/auth/login", { method: "POST", body: { email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD } });
  const page = await admin(`/admin/usuarios?q=${encodeURIComponent(email)}`);
  const id = /\/api\/admin\/users\/([0-9a-f-]{36})|"id":"([0-9a-f-]{36})"/.exec(page.data);
  const userId = id?.[1] || id?.[2] || /UserActions[^]*?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/.exec(page.data)?.[1];
  assert.ok(userId, "no se encontró el id del usuario en la tabla");
  assert.equal((await admin(`/api/admin/users/${userId}`, { method: "PATCH", body: { status: "suspended" } })).status, 200);
  assert.equal((await victim("/panel")).status, 307, "la sesión del usuario suspendido debe cerrarse");
  assert.equal((await client()("/api/auth/login", { method: "POST", body: { email, password: strongPassword } })).status, 403);
  assert.equal((await admin(`/api/admin/users/${userId}`, { method: "PATCH", body: { status: "active" } })).status, 200);
  assert.equal((await client()("/api/auth/login", { method: "POST", body: { email, password: strongPassword } })).status, 200);
});
