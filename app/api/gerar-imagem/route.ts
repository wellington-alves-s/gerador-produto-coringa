import { NextResponse } from "next/server";
import { ESTADO_INICIAL, type EstadoPedido } from "@/lib/pedido";
import { montarPromptImagem, podeGerarImagem } from "@/lib/prompt-imagem";
import { PRODUTOS } from "@/produtos";
import type { TipoProdutoId } from "@/produtos/tipos";
import { ErroGeracaoImagem, gerarImagemComGemini, type ReferenciaImagem } from "@/lib/servidor/gemini";
import { verificarAcesso } from "@/lib/servidor/protecao";

// A Vercel limita o corpo da requisição a ~4,5 MB.
const LIMITE_BYTES_CORPO = 4_000_000;
const LIMITE_CAMPO_TEXTO = 2_000;

type Corpo = {
  estado?: {
    tipo?: unknown;
    pedido?: Record<string, unknown>;
    especificacoes?: Record<string, unknown>;
  };
  referencia?: unknown;
};

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.slice(0, LIMITE_CAMPO_TEXTO) : "";
}

/** Reconstrói só o que o prompt usa, descartando qualquer outro dado enviado pelo cliente. */
function estadoSaneado(corpo: Corpo): EstadoPedido | null {
  const tipo = corpo.estado?.tipo;
  if (typeof tipo !== "string" || !(tipo in PRODUTOS)) return null;
  const pedido = corpo.estado?.pedido ?? {};
  const especificacoes: Record<string, string> = {};
  for (const campo of PRODUTOS[tipo as TipoProdutoId].campos) {
    const valor = texto(corpo.estado?.especificacoes?.[campo.id]);
    if (valor) especificacoes[campo.id] = valor;
  }
  return {
    ...ESTADO_INICIAL,
    tipo: tipo as TipoProdutoId,
    pedido: {
      ...ESTADO_INICIAL.pedido,
      descricao: texto(pedido.descricao),
      notaAdicional: texto(pedido.notaAdicional),
    },
    especificacoes,
  };
}

function referenciaValida(valor: unknown): ReferenciaImagem | undefined {
  if (typeof valor !== "string") return undefined;
  const correspondencia = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(valor);
  return correspondencia ? { mimeType: correspondencia[1], base64: correspondencia[2] } : undefined;
}

function erro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

export async function POST(requisicao: Request) {
  const acesso = await verificarAcesso(requisicao);
  if (!acesso.permitido) return erro(acesso.mensagem, acesso.status);

  const tamanho = Number(requisicao.headers.get("content-length") ?? 0);
  if (tamanho > LIMITE_BYTES_CORPO) return erro("Requisição grande demais.", 413);

  let corpo: Corpo;
  try {
    corpo = await requisicao.json();
  } catch {
    return erro("Corpo da requisição inválido.", 400);
  }

  const estado = estadoSaneado(corpo);
  if (!estado || !podeGerarImagem(estado.tipo)) return erro("Este tipo de produto não permite gerar imagem.", 400);

  const referencia = referenciaValida(corpo.referencia);
  const prompt = montarPromptImagem(estado, { temReferencia: Boolean(referencia) });
  if (!prompt) return erro("Não foi possível montar a descrição da imagem.", 400);

  try {
    const imagem = await gerarImagemComGemini(prompt, referencia);
    return NextResponse.json({ imagem: `data:${imagem.mimeType};base64,${imagem.base64}` });
  } catch (causa) {
    if (causa instanceof ErroGeracaoImagem) return erro(causa.message, causa.status);
    return erro("Erro inesperado ao gerar a imagem.", 500);
  }
}
