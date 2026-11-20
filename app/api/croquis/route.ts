import { NextResponse } from "next/server";
import { LIMITE_BYTES_CROQUI, listarCroquis, salvarCroqui } from "@/lib/servidor/croquis";
import { ErroValidacao } from "@/lib/servidor/erros";
import { exigirUsuario } from "@/lib/servidor/protecao";

const erro = (mensagem: string, status: number) => NextResponse.json({ erro: mensagem }, { status });

export async function POST(requisicao: Request) {
  const acesso = await exigirUsuario(requisicao);
  if (!acesso.ok) return acesso.resposta;

  const bruto = await requisicao.text();
  // Folga para o envelope {id, estado}; o limite do croqui em si é conferido em salvarCroqui.
  if (Buffer.byteLength(bruto) > LIMITE_BYTES_CROQUI + 1000) {
    return erro("Croqui grande demais para salvar na nuvem (muitas imagens).", 413);
  }
  let corpo: { id?: unknown; estado?: unknown };
  try {
    corpo = JSON.parse(bruto);
  } catch {
    return erro("Requisição inválida.", 400);
  }

  try {
    const salvo = await salvarCroqui(acesso.usuario, {
      id: corpo.id === undefined || corpo.id === null ? null : (corpo.id as number),
      estado: corpo.estado,
    });
    return salvo ? NextResponse.json(salvo) : erro("Croqui não encontrado.", 404);
  } catch (e) {
    if (e instanceof ErroValidacao) return erro(e.message, e.status);
    throw e;
  }
}

export async function GET(requisicao: Request) {
  const acesso = await exigirUsuario(requisicao);
  if (!acesso.ok) return acesso.resposta;
  const params = new URL(requisicao.url).searchParams;
  const vendedor = Number(params.get("vendedor"));
  return NextResponse.json(
    await listarCroquis(acesso.usuario, {
      busca: params.get("busca") ?? "",
      pagina: Number(params.get("pagina")) || 1,
      vendedorId: Number.isInteger(vendedor) && vendedor > 0 ? vendedor : undefined,
    })
  );
}
