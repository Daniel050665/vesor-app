# Pruebas y errores corregidos

Fecha: 23 de octubre de 2026 · Entorno: Windows 11, Node 20, Next.js 14.2.35, PGlite (desarrollo).

## 1. Revisión del proyecto existente

| Hallazgo | Situación | Acción |
|---|---|---|
| La carpeta local correspondía a la rama `main` del repositorio, sin la portada ni el simulador desplegados en producción. | La versión vigente (portada con órbita y logos, simulador) estaba en la rama `feature-samuelfl680`. | Se tomó esa versión como base para no perder lo que ya funcionaba. |
| Acceso solo con sesión anónima de Supabase; no había registro real ni roles. | No cumplía con usuarios/administradores. | Autenticación propia con correo y contraseña, roles `user`/`admin` y sesiones en PostgreSQL. |
| El historial consultaba la tabla `analyses`, pero el simulador nunca guardaba nada: el historial siempre estaba vacío. | Error funcional. | El simulador guarda cada análisis (recalculado en el servidor) y todas las acciones se registran en `activity_log`. |
| `src/lib/risk.ts` enviaba `temperature`, que la API de Claude rechaza desde el 21/10/2026, y usaba `max_tokens: 1200`, insuficiente con razonamiento adaptativo. | La evaluación con IA habría fallado. | Se quitó `temperature`, se ajustó `max_tokens` y el modelo por defecto. |
| Nombre de variable inconsistente (`NEXT_PUBLIC_SUPABASE_ANON_KEY` vs `PUBLISHABLE_KEY`) entre middleware y clientes. | Fallaba según la variable definida. | Se eliminó la dependencia del cliente de Supabase; la conexión es una sola (`DATABASE_URL`). |
| Las noticias y cotizaciones eran fijas en el código. | Datos de ejemplo presentados como contenido. | Noticias reales por RSS; cotizaciones reales de cripto y datos demo claramente etiquetados para acciones sin clave. |

## 2. Pruebas automatizadas (`npm test`)

Resultado final: **9 de 9 pruebas aprobadas**.

1. Rutas privadas redirigen al login sin sesión.
2. Registro: validaciones (contraseña débil, menor de edad, sin intereses) y rechazo de correos duplicados (incluso con mayúsculas).
3. Las mutaciones sin cabecera `Origin` se rechazan (CSRF).
4. Inicio de sesión: credenciales incorrectas → 401; cuenta de usuario → `/panel`; cuenta de administrador → `/admin`.
5. Un usuario normal recibe 403 en las APIs de administración y es redirigido fuera de `/admin`.
6. Flujo completo de usuario: lista de seguimiento sin duplicados, chatbot con conversación persistente, simulación guardada, abrir y guardar noticias, actualizar preferencias e historial completo, sin duplicados, en orden cronológico y filtrable.
7. Aislamiento: un usuario no puede ver, continuar ni borrar conversaciones o análisis de otro (404).
8. Recuperación de contraseña: respuesta idéntica exista o no el correo, enlace de un solo uso, la contraseña anterior deja de funcionar; cierre de sesión.
9. Administración: suspender una cuenta cierra sus sesiones e impide el login; reactivarla lo permite de nuevo.

## 3. Pruebas manuales en navegador

- Portada: idéntica a la versión desplegada, con el nuevo texto del enlace principal y accesos de inicio de sesión/registro.
- Panel, mercado, ficha de activo, asistente, noticias, historial, perfil y administración renderizan sin errores (HTTP 200).
- Registro en vista móvil (375 px): sin desplazamiento horizontal.
- `npm run build` y `npm run typecheck` sin errores ni advertencias.

## 4. Errores encontrados durante la implementación y corregidos

| # | Error | Causa | Corrección |
|---|---|---|---|
| 1 | El login respondía 500 la primera vez. | PGlite no crea la carpeta padre `.data/`. | Se crea la carpeta de forma recursiva antes de abrir la base. |
| 2 | Las cuentas de prueba no se creaban («al menos 10 caracteres»). | En `.env` el carácter `#` sin comillas inicia un comentario y truncaba la contraseña. | Valores entre comillas simples; documentado en `.env.example`. |
| 3 | BTC/ETH pasaban a datos demo tras varias consultas. | Límite de CoinGecko gratuito (HTTP 429). | Una sola consulta compartida para todo el catálogo cripto, caché con último dato válido y pausa de 1 minuto tras un error. |
| 4 | Prueba de historial detectaba un «duplicado» inexistente. | El HTML de Next.js repite el texto en el payload RSC. | Se añadió `GET /api/history` (JSON) y la prueba valida sobre los datos. |
| 5 | Las barras de actividad diaria del admin mostraban el día siguiente. | Agrupación en UTC. | Agrupación por día en zona horaria `America/Bogota`. |
| 6 | Precios recortados y etiquetas «Demo» estiradas en el resumen del mercado. | Estilos `nowrap` y `display: block` heredados. | Ajuste de estilos de las tarjetas. |
| 7 | Texto ilegible en el botón «Crear cuenta» de la portada. | Regla de color de enlaces de la portada con mayor especificidad. | Regla específica para el botón. |
| 8 | `/api/market` quedaba congelado en el build. | Se pre-renderizaba como ruta estática. | Marcada como dinámica. |
