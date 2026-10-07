import type { EstadoPedido } from "./pedido";
import { BIBLIOTECA } from "./biblioteca-dados";
import { caminhoImagem } from "./biblioteca";

// Referências maiores que isso são omitidas para não estourar o limite do corpo da requisição.
const LIMITE_REFERENCIA_BYTES = 1_500_000;
const TIPOS_REFERENCIA = ["image/jpeg", "image/png", "image/webp"];

function blobParaDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(leitor.error);
    leitor.onload = () => resolve(leitor.result as string);
    leitor.readAsDataURL(blob);
  });
}

/** Imagem já escolhida na etapa (upload ou biblioteca), usada como referência de estilo. Opcional. */
export async function obterReferenciaDataUrl(estado: EstadoPedido): Promise<string | null> {
  try {
    if (estado.imagem.origem === "upload") return estado.imagem.uploadDataUrl;
    if (estado.imagem.origem === "biblioteca") {
      const item = BIBLIOTECA.find((i) => i.id === estado.imagem.bibliotecaId);
      if (!item) return null;
      const resposta = await fetch(caminhoImagem(item));
      if (!resposta.ok) return null;
      const blob = await resposta.blob();
      if (blob.size > LIMITE_REFERENCIA_BYTES || !TIPOS_REFERENCIA.includes(blob.type)) return null;
      return await blobParaDataUrl(blob);
    }
  } catch {
    // referência é opcional — segue sem ela
  }
  return null;
}

export async function solicitarImagemGerada(estado: EstadoPedido, referencia: string | null): Promise<string> {
  let resposta: Response;
  try {
    resposta = await fetch("/api/gerar-imagem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        estado: { tipo: estado.tipo, pedido: estado.pedido, especificacoes: estado.especificacoes },
        referencia,
      }),
    });
  } catch {
    throw new Error("Sem conexão com o servidor. Verifique a internet e tente de novo.");
  }

  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok || !dados?.imagem) {
    throw new Error(dados?.erro ?? "Não foi possível gerar a imagem.");
  }
  return dados.imagem as string;
}

export async function dataUrlParaArquivo(dataUrl: string, nome = "imagem-gerada"): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], nome, { type: blob.type });
}
