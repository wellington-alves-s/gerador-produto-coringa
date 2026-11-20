import { NextResponse } from "next/server";
import { duplicarCroqui } from "@/lib/servidor/croquis";
import { exigirUsuario } from "@/lib/servidor/protecao";

export async function POST(requisicao: Request, { params }: { params: Promise<{ id: string }> }) {
  const acesso = await exigirUsuario(requisicao);
  if (!acesso.ok) return acesso.resposta;
  const id = Number((await params).id);
  const copia = Number.isInteger(id) && id > 0 ? await duplicarCroqui(acesso.usuario, id) : null;
  return copia ? NextResponse.json(copia) : NextResponse.json({ erro: "Croqui não encontrado." }, { status: 404 });
}
