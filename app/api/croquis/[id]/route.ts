import { NextResponse } from "next/server";
import { excluirCroqui, obterCroqui } from "@/lib/servidor/croquis";
import { exigirUsuario } from "@/lib/servidor/protecao";

type Contexto = { params: Promise<{ id: string }> };

const naoEncontrado = () => NextResponse.json({ erro: "Croqui não encontrado." }, { status: 404 });

async function idDaUrl({ params }: Contexto): Promise<number | null> {
  const id = Number((await params).id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(requisicao: Request, contexto: Contexto) {
  const acesso = await exigirUsuario(requisicao);
  if (!acesso.ok) return acesso.resposta;
  const id = await idDaUrl(contexto);
  const croqui = id ? await obterCroqui(acesso.usuario, id) : null;
  return croqui ? NextResponse.json(croqui) : naoEncontrado();
}

export async function DELETE(requisicao: Request, contexto: Contexto) {
  const acesso = await exigirUsuario(requisicao);
  if (!acesso.ok) return acesso.resposta;
  const id = await idDaUrl(contexto);
  if (!id || !(await excluirCroqui(acesso.usuario, id))) return naoEncontrado();
  return new Response(null, { status: 204 });
}
