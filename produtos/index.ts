import type { ConfigProduto, TipoProdutoId } from "./tipos";

export const PRODUTOS = {} as Record<TipoProdutoId, ConfigProduto>;

export function listarProdutos(): ConfigProduto[] {
  return Object.values(PRODUTOS);
}
