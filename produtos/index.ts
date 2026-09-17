import type { ConfigProduto, TipoProdutoId } from "./tipos";
import { portaMarcenaria } from "./porta-marcenaria";
import { portaEspecial } from "./porta-especial";
import { portaAcm } from "./porta-acm";
import { esquadria } from "./esquadria";
import { degrauPatamarRodape } from "./degrau-patamar-rodape";
import { outros } from "./outros";

export const PRODUTOS: Record<TipoProdutoId, ConfigProduto> = {
  "porta-marcenaria": portaMarcenaria,
  "porta-especial": portaEspecial,
  "porta-acm": portaAcm,
  esquadria,
  "degrau-patamar-rodape": degrauPatamarRodape,
  outros,
};

export function listarProdutos(): ConfigProduto[] {
  return Object.values(PRODUTOS);
}
