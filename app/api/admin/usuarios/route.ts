import { NextResponse } from "next/server";
import { ErroUsuarioExistente, ErroValidacao } from "@/lib/servidor/erros";
import { exigirAdmin } from "@/lib/servidor/protecao";
import { criarUsuario, listarUsuarios } from "@/lib/servidor/usuarios";

const erro = (mensagem: string, status: number) => NextResponse.json({ erro: mensagem }, { status });

export async function GET(requisicao: Request) {
  const acesso = await exigirAdmin(requisicao);
  if (!acesso.ok) return acesso.resposta;
  return NextResponse.json(await listarUsuarios());
}

export async function POST(requisicao: Request) {
  const acesso = await exigirAdmin(requisicao);
  if (!acesso.ok) return acesso.resposta;

  let corpo: { usuario?: unknown; nome?: unknown; senha?: unknown; admin?: unknown };
  try {
    corpo = await requisicao.json();
  } catch {
    return erro("Requisição inválida.", 400);
  }
  if (typeof corpo.usuario !== "string" || typeof corpo.nome !== "string" || typeof corpo.senha !== "string") {
    return erro("Informe usuário, nome e senha.", 400);
  }

  try {
    const criado = await criarUsuario({
      usuario: corpo.usuario,
      nome: corpo.nome,
      senha: corpo.senha,
      admin: corpo.admin === true,
    });
    return NextResponse.json(criado, { status: 201 });
  } catch (e) {
    if (e instanceof ErroUsuarioExistente) return erro(e.message, 409);
    if (e instanceof ErroValidacao) return erro(e.message, e.status);
    throw e;
  }
}
