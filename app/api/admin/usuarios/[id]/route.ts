import { NextResponse } from "next/server";
import { ErroValidacao } from "@/lib/servidor/erros";
import { exigirAdmin } from "@/lib/servidor/protecao";
import { buscarPorId, definirAtivo, trocarSenha } from "@/lib/servidor/usuarios";

const erro = (mensagem: string, status: number) => NextResponse.json({ erro: mensagem }, { status });

export async function PATCH(requisicao: Request, { params }: { params: Promise<{ id: string }> }) {
  const acesso = await exigirAdmin(requisicao);
  if (!acesso.ok) return acesso.resposta;

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0 || !(await buscarPorId(id))) return erro("Conta não encontrada.", 404);

  let corpo: { senha?: unknown; ativo?: unknown };
  try {
    corpo = await requisicao.json();
  } catch {
    return erro("Requisição inválida.", 400);
  }

  try {
    if (typeof corpo.senha === "string") {
      await trocarSenha(id, corpo.senha);
    } else if (typeof corpo.ativo === "boolean") {
      if (!corpo.ativo && id === acesso.usuario.id) return erro("Você não pode desativar a própria conta.", 400);
      await definirAtivo(id, corpo.ativo);
    } else {
      return erro("Informe a nova senha ou o estado (ativo).", 400);
    }
  } catch (e) {
    if (e instanceof ErroValidacao) return erro(e.message, e.status);
    throw e;
  }
  return new Response(null, { status: 204 });
}
