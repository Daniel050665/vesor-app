# Vesor — Investment & Advisory

Plataforma web para aprender a invertir, analizar oportunidades del mercado y decidir con más información.
Incluye registro con perfil inversor, panel personalizado, mercado con indicadores, un asistente de análisis
financiero con IA, noticias de fuentes externas, historial de actividad y un panel de administración.

**Stack:** Next.js 14 (App Router, TypeScript) · PostgreSQL (Supabase en producción, PGlite embebido en desarrollo) · API de Claude (Anthropic) · Vercel.

> Vesor es una herramienta informativa y educativa. Sus análisis no garantizan rendimientos ni sustituyen la evaluación personal del riesgo.

## Funcionalidades

| Módulo | Ruta | Descripción |
|---|---|---|
| Portada | `/` | Se conserva el diseño y las animaciones originales. El llamado a la acción ahora dice «Comienza tu análisis inteligente». |
| Registro / acceso | `/registro`, `/login`, `/recuperar`, `/restablecer` | Registro con nombre, correo, contraseña segura, fecha de nacimiento (mayoría de edad), nivel de experiencia, intereses y, opcionalmente, objetivo, horizonte y tolerancia al riesgo. Recuperación de contraseña con enlace de un solo uso (30 min). |
| Panel de usuario | `/panel` | Resumen del mercado, lista de seguimiento, ideas personalizadas con riesgos y pérdidas posibles, activos de sus intereses, noticias filtradas, actividad reciente y acceso al asistente. |
| Mercado | `/mercado`, `/activo/[símbolo]` | Catálogo de 39 activos (acciones, ETF y criptomonedas) con filtros; ficha con gráfico, rendimiento 30/90 días, medias móviles, RSI, volatilidad, caída máxima, ventajas y riesgos. |
| Análisis de riesgo | `/analizar` | El simulador existente (antes «Simulador»), ahora guarda cada análisis en el historial. |
| Asistente IA | `/chat` | Chatbot que analiza activos, compara, explica conceptos y sugiere ideas según el perfil. Conversaciones persistentes. |
| Noticias | `/noticias` | Titulares de Yahoo Finance, CNBC, MarketWatch, CoinDesk, Cointelegraph, Reserva Federal, TechCrunch y OilPrice vía RSS oficial; filtros por categoría e intereses; guardar noticias. |
| Historial | `/historial` | Inicio/cierre de sesión, consultas al chatbot, análisis, simulaciones, activos consultados y seguidos, noticias visitadas/guardadas y cambios de perfil, en orden cronológico, con filtros y detalle. |
| Perfil | `/perfil` | Edición de intereses, nivel, objetivos y tolerancia al riesgo; cambio de contraseña. |
| Administración | `/admin` | Estadísticas de uso, estado de la plataforma, usuarios (suspender/reactivar, rol), registros de actividad de todos los usuarios y gestión de fuentes de noticias. |

## Correr en local

Requisitos: Node.js 18.17+ (probado con Node 20).

```bash
npm install
```

```bash
cp .env.example .env.local
```

Define en `.env.local` al menos las contraseñas de las cuentas de prueba (`SEED_ADMIN_PASSWORD`, `SEED_USER_PASSWORD`, entre comillas simples). Todo lo demás es opcional.

```bash
npm run dev
```

Abrir http://localhost:3000. Sin `DATABASE_URL` la app crea automáticamente una base PostgreSQL embebida (PGlite) en `./.data/pglite`, aplica el esquema y crea las cuentas de prueba. Para empezar de cero basta con borrar la carpeta `.data/`.

### Pruebas

Con el servidor en marcha:

```bash
npm test
```

Ejecuta `tests/api.test.mjs` (9 pruebas de extremo a extremo: rutas protegidas, registro y validaciones, CSRF, inicio de sesión, permisos de administrador, seguimiento, chatbot, simulaciones, noticias, perfil, historial, aislamiento entre usuarios, recuperación de contraseña y suspensión de cuentas). Las pruebas crean usuarios `*@vesor.test` en la base local. También hay verificación de tipos con `npm run typecheck`.

## Variables de entorno

| Variable | Obligatoria | Uso |
|---|---|---|
| `DATABASE_URL` | En producción | PostgreSQL. En Supabase: *Project Settings → Database → Connection string → Transaction pooler*. Sin ella se usa PGlite local (no persiste en Vercel, por eso allí es obligatoria). |
| `APP_URL` | Recomendada | URL pública para los enlaces de recuperación de contraseña. |
| `ANTHROPIC_API_KEY` | No | Activa el asistente con IA (Claude). Sin clave funciona en «modo local» con reglas y datos, indicado en cada respuesta. |
| `ANTHROPIC_MODEL` | No | Por defecto `claude-opus-5-5`. |
| `ALPHA_VANTAGE_API_KEY`, `MARKET_DATA_PROVIDER` | No | Cotizaciones e históricos de acciones/ETF. Sin clave se usan **datos de demostración marcados como tales**. |
| `RESEND_API_KEY`, `MAIL_FROM` | No | Envío del correo de recuperación. Sin proveedor, en desarrollo el enlace aparece en la consola y en pantalla; en producción no se muestra. |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_USER_EMAIL`, `SEED_USER_PASSWORD` | No | Cuentas de prueba creadas al iniciar (ver abajo). |
| `ALLOW_PRODUCTION_SEED` | No | Debe ser `true` para que el seed corra con `NODE_ENV=production`. |
| `SEED_RESET_PASSWORDS` | No | `true` para volver a fijar la contraseña de las cuentas de prueba existentes. |
| `PGLITE_DATA_DIR` | No | Carpeta de la base local (por defecto `./.data/pglite`). |

Ninguna clave se usa en el navegador: todas se leen solo en el servidor. `.env*` está en `.gitignore` (salvo `.env.example`).

## Cuentas de prueba

Se crean mediante un mecanismo de inicialización controlado (`src/lib/db/seed.ts`), no con credenciales fijas en el código:

- Correos por defecto: `admin@vesor.test` (rol administrador) y `usuario@vesor.test` (rol usuario, principiante, intereses tecnología/IA/cripto).
- Las contraseñas se leen de `SEED_ADMIN_PASSWORD` / `SEED_USER_PASSWORD`. El seed rechaza contraseñas débiles, no sobrescribe contraseñas de cuentas existentes y no se ejecuta en producción salvo con `ALLOW_PRODUCTION_SEED=true`.
- En esta copia local las contraseñas se generaron aleatoriamente y están en `.env.local` y en `cuentas-prueba.local.md` (ambos ignorados por git).

## Fuentes de datos

- **Criptomonedas:** CoinGecko (API pública). Precios reales con atribución; si el servicio limita las consultas se sirve el último dato válido y, si no hay ninguno, un dato demo marcado.
- **Acciones y ETF:** Alpha Vantage (plan gratuito con límites y retraso). Sin clave: serie de demostración determinista, siempre etiquetada «Demo» / «dato simulado».
- **Noticias:** feeds RSS públicos (Yahoo Finance, CNBC, MarketWatch, CoinDesk, Cointelegraph, Federal Reserve, TechCrunch, OilPrice). Solo se guardan título, resumen corto, fecha, fuente y enlace al original. Se actualizan cada 30 minutos, se eliminan duplicados (por URL y por título normalizado) y se descartan noticias de más de 14 días. Si una fuente falla se registra el error, se siguen mostrando las demás y el administrador la ve en el panel. Las fuentes pueden agregarse o deshabilitarse desde `/admin/noticias`. Revisa las condiciones de uso de cada medio antes de un uso comercial.
- **Simulador:** las noticias y relaciones del simulador son datos de demostración (se indica en pantalla).

## Arquitectura

```
src/app/                    Páginas (App Router) y rutas API
src/app/api/auth/*          Registro, login, logout, recuperación y restablecimiento
src/app/api/chat/*          Chatbot y conversaciones
src/app/api/admin/*         APIs exclusivas de administración (rol verificado en el servidor)
src/lib/db/                 Conexión (Postgres o PGlite), esquema y seed
src/lib/auth.ts             Sesiones, guardas de usuario/admin, CSRF y límite de intentos
src/lib/password.ts         Hash scrypt con sal por usuario
src/lib/validation.ts       Validaciones compartidas navegador/servidor
src/lib/market-data.ts      Cotizaciones, históricos e indicadores técnicos
src/lib/assets.ts           Catálogo de activos con volatilidad y riesgos
src/lib/personalization.ts  Recomendaciones según intereses, experiencia, tolerancia y horizonte
src/lib/chat.ts             Motor del asistente (Claude + modo local)
src/lib/news.ts             Lectura RSS, deduplicación y caché de noticias
src/lib/activity.ts         Registro del historial (con deduplicación)
src/lib/simulation.ts       Lógica del simulador de riesgo
supabase/schema.sql         Copia del esquema para ejecutarlo manualmente en Supabase
tests/api.test.mjs          Pruebas de extremo a extremo
```

### Seguridad

- Contraseñas con **scrypt** y sal aleatoria; nunca se devuelven ni se muestran en el panel de administración.
- Sesiones con token aleatorio en cookie `httpOnly`, `SameSite=Lax` y `Secure` en producción; en la base solo se guarda el hash SHA-256 del token. Al cambiar o restablecer la contraseña y al suspender una cuenta se cierran sus sesiones.
- **Permisos en el backend:** cada página privada valida la sesión contra la base de datos y cada API de administración verifica el rol `admin`. Las consultas de datos personales filtran por `user_id` en SQL. El middleware es solo una primera barrera.
- Protección CSRF por verificación de `Origin` en todas las peticiones que modifican datos.
- Límite de intentos en login (5 cada 15 min), registro, recuperación, cambio de contraseña y chatbot.
- Mensajes de login y recuperación que no revelan si un correo existe.
- En Supabase todas las tablas tienen RLS activado sin políticas: la API pública (`anon`) no puede leerlas; solo el servidor, con `DATABASE_URL`.
- El texto del usuario y los datos de mercado se envían a Claude como datos, no como instrucciones.

## Despliegue (Vercel + Supabase)

1. Crear un proyecto en Supabase y copiar la cadena de conexión *Transaction pooler* en `DATABASE_URL`.
2. (Opcional) Ejecutar `supabase/schema.sql` en el SQL Editor; si no, la app lo aplica al primer acceso.
3. Importar el repositorio en Vercel y definir las variables de entorno (mínimo `DATABASE_URL` y `APP_URL`).
4. Para crear el primer administrador en producción: definir `SEED_ADMIN_EMAIL`, una contraseña fuerte en `SEED_ADMIN_PASSWORD` y `ALLOW_PRODUCTION_SEED=true` en un despliegue; luego quitar esas variables.

## Limitaciones conocidas

- Sin `ALPHA_VANTAGE_API_KEY` las acciones/ETF usan datos de demostración; con el plan gratuito solo se consultan pocas cotizaciones por minuto.
- CoinGecko gratuito limita las consultas por minuto; la app guarda en caché y reutiliza el último dato válido.
- La mayoría de noticias está en inglés.
- El límite de intentos se guarda en memoria por instancia (suficiente para el MVP; para varias instancias se recomienda Redis o similar).
- El simulador de riesgo sigue usando noticias y relaciones de demostración.

Más detalle de las pruebas realizadas y los errores corregidos en [`docs/PRUEBAS.md`](docs/PRUEBAS.md).
