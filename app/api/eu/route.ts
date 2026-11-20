import { NextResponse } from "next/server";
import { lerCookie } from "@/lib/servidor/cookies";
import { COOKIE_SESSAO, lerSessao } from "@/lib/servidor/sessao";
import { buscarPorId } from "@/lib/servidor/usuarios";

export async function GET(requisicao: Request) {
  const sessao = await lerSessao(lerCookie(requisicao, COOKIE_SESSAO));
  // Confere o banco a cada chamada: desativar uma conta vale na hora, mesmo com o cookie ainda válido.
  const conta = sessao ? await buscarPorId(sessao.id) : null;
  if (!conta || !conta.ativo) return NextResponse.json({ erro: "Faça login para continuar." }, { status: 401 });
  return NextResponse.json({ usuario: conta.usuario, nome: conta.nome, admin: conta.admin });
}
