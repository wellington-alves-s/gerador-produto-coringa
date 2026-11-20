import { NextResponse } from "next/server";
import { identificarCliente } from "@/lib/servidor/protecao";
import { conferirSenha, hashSenha } from "@/lib/servidor/senha";
import { COOKIE_SESSAO, criarSessao, opcoesCookieSessao } from "@/lib/servidor/sessao";
import { limparTentativas, registrarFalha, tentativasEsgotadas } from "@/lib/servidor/tentativas";
import { buscarPorUsuario } from "@/lib/servidor/usuarios";

const LIMITE_POR_USUARIO = 5;
// Maior que o limite por usuário: a loja inteira pode sair para a internet por um IP só.
const LIMITE_POR_IP = 30;
const MENSAGEM_INVALIDO = "Usuário ou senha inválidos";

// Usado quando o usuário não existe, para o tempo de resposta não revelar isso.
const hashFalso = hashSenha("senha-que-nunca-confere");

function resposta(corpo: object, status: number) {
  return NextResponse.json(corpo, { status });
}

export async function POST(requisicao: Request) {
  let corpo: { usuario?: unknown; senha?: unknown };
  try {
    corpo = await requisicao.json();
  } catch {
    return resposta({ erro: "Requisição inválida." }, 400);
  }
  if (typeof corpo.usuario !== "string" || typeof corpo.senha !== "string") {
    return resposta({ erro: "Informe usuário e senha." }, 400);
  }

  const usuario = corpo.usuario.trim().toLowerCase();
  const chaveUsuario = `u:${usuario}`;
  const chaveIp = `ip:${identificarCliente(requisicao)}`;

  if ((await tentativasEsgotadas(chaveUsuario, LIMITE_POR_USUARIO)) || (await tentativasEsgotadas(chaveIp, LIMITE_POR_IP))) {
    return resposta({ erro: "Muitas tentativas. Aguarde cerca de 15 minutos e tente de novo." }, 429);
  }

  const conta = await buscarPorUsuario(usuario);
  const senhaCerta = await conferirSenha(corpo.senha, conta?.senhaHash ?? (await hashFalso));
  if (!conta || !conta.ativo || !senhaCerta) {
    await registrarFalha(chaveUsuario);
    await registrarFalha(chaveIp);
    return resposta({ erro: MENSAGEM_INVALIDO }, 401);
  }

  await limparTentativas(chaveUsuario);
  const token = await criarSessao({ id: conta.id, usuario: conta.usuario, nome: conta.nome, admin: conta.admin });
  const r = resposta({ usuario: conta.usuario, nome: conta.nome, admin: conta.admin }, 200);
  r.cookies.set(COOKIE_SESSAO, token, opcoesCookieSessao());
  return r;
}
