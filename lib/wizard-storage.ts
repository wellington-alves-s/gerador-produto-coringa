import { ESTADO_INICIAL, type EstadoPedido, type EtapaId } from "./pedido";
import { DESENHO_INICIAL } from "./desenho";

export const CHAVE_RASCUNHO = "produto-coringa:rascunho";

const ETAPAS_VALIDAS: EtapaId[] = ["tipo", "pedido", "especificacoes", "imagem", "revisao"];

/** Versões do rascunho, da mais completa para a mais enxuta, para quando o localStorage estoura a cota. */
function versoesDoRascunho(estado: EstadoPedido): EstadoPedido[] {
  const semImagensColadas: EstadoPedido = {
    ...estado,
    desenho: { ...estado.desenho, elementos: estado.desenho.elementos.filter((e) => e.tipo !== "imagem") },
  };
  const semNadaPesado: EstadoPedido = {
    ...semImagensColadas,
    imagem: { ...estado.imagem, uploadDataUrl: null },
  };
  return [estado, semImagensColadas, semNadaPesado];
}

export function salvarRascunho(estado: EstadoPedido): void {
  for (const versao of versoesDoRascunho(estado)) {
    try {
      window.localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(versao));
      return;
    } catch {
      // cota esgotada (ou localStorage indisponível): tenta a próxima versão, mais leve
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
    // Rascunhos antigos podem não ter o desenho (ou campos novos dele).
    return { ...ESTADO_INICIAL, ...dados, desenho: { ...DESENHO_INICIAL, ...(dados.desenho ?? {}) }, ultimaEtapa };
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
