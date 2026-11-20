import type { EstadoPedido } from "./pedido";

export class ErroSalvamento extends Error {
  constructor(
    mensagem: string,
    readonly status: number
  ) {
    super(mensagem);
  }
}

function mensagemDoStatus(status: number): string {
  if (status === 413) return "Croqui grande demais para salvar na nuvem (muitas imagens). Reduza as imagens coladas.";
  if (status === 401) return "Sua sessão expirou. Entre novamente.";
  if (status === 404) return "Este croqui não está mais disponível para salvar.";
  return "Não foi possível salvar o croqui na nuvem. Tente novamente.";
}

/** Cria o croqui (sem `croquiId`) ou atualiza o existente; devolve o id. */
export async function salvarCroquiNoServidor(estado: EstadoPedido): Promise<number> {
  let resposta: Response;
  try {
    resposta = await fetch("/api/croquis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: estado.croquiId ?? undefined, estado }),
    });
  } catch {
    throw new ErroSalvamento("Sem conexão com o servidor. O croqui não foi salvo na nuvem.", 0);
  }
  if (!resposta.ok) throw new ErroSalvamento(mensagemDoStatus(resposta.status), resposta.status);
  return (await resposta.json()).id as number;
}
