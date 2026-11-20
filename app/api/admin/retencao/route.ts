import { NextResponse } from "next/server";
import { ErroValidacao } from "@/lib/servidor/erros";
import { lerRetencao, lerUltimaLimpeza, salvarRetencao } from "@/lib/servidor/limpeza";
import { exigirAdmin } from "@/lib/servidor/protecao";

const erro = (mensagem: string, status: number) => NextResponse.json({ erro: mensagem }, { status });

async function estadoAtual() {
  return NextResponse.json({ retencao: await lerRetencao(), ultimaLimpeza: await lerUltimaLimpeza() });
}

export async function GET(requisicao: Request) {
  const acesso = await exigirAdmin(requisicao);
  if (!acesso.ok) return acesso.resposta;
  return estadoAtual();
}

export async function PUT(requisicao: Request) {
  const acesso = await exigirAdmin(requisicao);
  if (!acesso.ok) return acesso.resposta;

  let corpo: { maxPorVendedor?: unknown; maxDias?: unknown };
  try {
    corpo = await requisicao.json();
  } catch {
    return erro("Requisição inválida.", 400);
  }
  if (typeof corpo.maxPorVendedor !== "number" || (corpo.maxDias !== null && typeof corpo.maxDias !== "number")) {
    return erro("Informe maxPorVendedor (número) e maxDias (número ou nulo).", 400);
  }
  try {
    await salvarRetencao({ maxPorVendedor: corpo.maxPorVendedor, maxDias: corpo.maxDias });
  } catch (e) {
    if (e instanceof ErroValidacao) return erro(e.message, e.status);
    throw e;
  }
  return estadoAtual();
}
