import { ESTADO_INICIAL, type EstadoPedido, type EtapaId } from "./pedido";

export const CHAVE_RASCUNHO = "produto-coringa:rascunho";

const ETAPAS_VALIDAS: EtapaId[] = ["tipo", "pedido", "especificacoes", "imagem", "revisao"];

export function salvarRascunho(estado: EstadoPedido): void {
  try {
    window.localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(estado));
  } catch {
    try {
      const semImagemAvulsa: EstadoPedido = {
        ...estado,
        imagem: { ...estado.imagem, uploadDataUrl: null },
      };
      window.localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(semImagemAvulsa));
    } catch {
      // localStorage genuinely indisponível (modo privado, cota esgotada mesmo sem a imagem) — ignora
    }
  }
}

export function carregarRascunho(): EstadoPedido | null {
  try {
    const bruto = window.localStorage.getItem(CHAVE_RASCUNHO);
    if (!bruto) return null;
    const dados = JSON.parse(bruto);
    if (typeof dados !== "object" || dados === null || !("pedido" in dados)) return null;
    const ultimaEtapa = ETAPAS_VALIDAS.includes(dados.ultimaEtapa) ? dados.ultimaEtapa : "tipo";
    return { ...ESTADO_INICIAL, ...dados, ultimaEtapa };
  } catch {
    return null;
  }
}

export function limparRascunho(): void {
  try {
    window.localStorage.removeItem(CHAVE_RASCUNHO);
  } catch {
    // ignora
  }
}

export function existeRascunho(): boolean {
  return carregarRascunho() !== null;
}
