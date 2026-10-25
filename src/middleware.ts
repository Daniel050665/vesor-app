import { NextResponse, type NextRequest } from "next/server";

// Primera barrera: sin cookie de sesión no se entra a las rutas privadas.
// La validación real (sesión vigente, cuenta activa y rol) ocurre en el servidor en cada página y API.
const PROTEGIDAS = ["/panel", "/mercado", "/activo", "/analizar", "/chat", "/historial", "/resultado", "/perfil", "/admin"];

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const hasSession = Boolean(request.cookies.get("vesor_session")?.value);
  if (!hasSession && PROTEGIDAS.some((p) => path === p || path.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|company-logos|api/).*)"],
};
