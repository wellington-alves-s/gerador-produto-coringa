import { jwtVerify, SignJWT } from "jose";

export type UsuarioSessao = { id: number; usuario: string; nome: string; admin: boolean };

export const COOKIE_SESSAO = "sessao";
const DURACAO_SEGUNDOS = 7 * 24 * 3600;

function segredo(): Uint8Array {
  const valor = process.env.SESSAO_SEGREDO;
  if (!valor || valor.length < 32) throw new Error("SESSAO_SEGREDO precisa ter pelo menos 32 caracteres.");
  return new TextEncoder().encode(valor);
}

export async function criarSessao(u: UsuarioSessao): Promise<string> {
  return new SignJWT({ id: u.id, usuario: u.usuario, nome: u.nome, admin: u.admin })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACAO_SEGUNDOS}s`)
    .sign(segredo());
}

export async function lerSessao(token: string | undefined): Promise<UsuarioSessao | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, segredo(), { algorithms: ["HS256"] });
    const { id, usuario, nome, admin } = payload;
    if (typeof id !== "number" || typeof usuario !== "string" || typeof nome !== "string") return null;
    return { id, usuario, nome, admin: admin === true };
  } catch {
    return null;
  }
}

export function opcoesCookieSessao() {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/" as const,
    maxAge: DURACAO_SEGUNDOS,
  };
}
