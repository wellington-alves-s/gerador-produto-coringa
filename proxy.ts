import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO, lerSessao } from "@/lib/servidor/sessao";

/**
 * Só redireciona páginas para /login quando não há sessão assinada válida. Não consulta o banco
 * (é uma checagem otimista); as rotas de API conferem a conta ativa por conta própria.
 */
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/login") return NextResponse.next();
  if (await lerSessao(request.cookies.get(COOKIE_SESSAO)?.value)) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // As rotas /api se protegem sozinhas (devolvem 401 em vez de redirecionar).
  matcher: ["/((?!api|login|_next|marca|biblioteca|favicon.ico).*)"],
};
