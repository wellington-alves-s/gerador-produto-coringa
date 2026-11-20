import { NextResponse } from "next/server";
import { lerCookie } from "./cookies";
import { COOKIE_SESSAO, lerSessao, type UsuarioSessao } from "./sessao";
import { buscarPorId } from "./usuarios";

/**
 * Ponto único de proteção das rotas de API: sessão válida (cookie assinado) E conta ativa no banco.
 * O banco é conferido a cada chamada para que desativar uma conta valha na hora.
 */
export type ResultadoAcesso = { permitido: true } | { permitido: false; status: number; mensagem: string };

export type ResultadoUsuario = { ok: true; usuario: UsuarioSessao } | { ok: false; resposta: Response };

export function identificarCliente(requisicao: Request): string {
  const encaminhado = requisicao.headers.get("x-forwarded-for");
  return encaminhado?.split(",")[0]?.trim() || requisicao.headers.get("x-real-ip") || "desconhecido";
}

function recusar(status: number, mensagem: string): ResultadoUsuario {
  return { ok: false, resposta: NextResponse.json({ erro: mensagem }, { status }) };
}

export async function exigirUsuario(requisicao: Request): Promise<ResultadoUsuario> {
  const sessao = await lerSessao(lerCookie(requisicao, COOKIE_SESSAO));
  const conta = sessao ? await buscarPorId(sessao.id) : null;
  // A versão do cookie precisa ser a atual: trocar a senha ou desativar a conta invalida as sessões antigas.
  if (!sessao || !conta || !conta.ativo || sessao.versao !== conta.sessaoVersao) return recusar(401, "Faça login para continuar.");
  // Os dados vêm do banco, não do cookie: promover/rebaixar um admin vale na hora.
  return { ok: true, usuario: { id: conta.id, usuario: conta.usuario, nome: conta.nome, admin: conta.admin } };
}

export async function exigirAdmin(requisicao: Request): Promise<ResultadoUsuario> {
  const r = await exigirUsuario(requisicao);
  if (!r.ok) return r;
  return r.usuario.admin ? r : recusar(403, "Acesso restrito ao administrador.");
}

export async function verificarAcesso(requisicao: Request): Promise<ResultadoAcesso> {
  const r = await exigirUsuario(requisicao);
  if (r.ok) return { permitido: true };
  return { permitido: false, status: r.resposta.status, mensagem: "Faça login para continuar." };
}
