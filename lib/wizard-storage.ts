import { ESTADO_INICIAL, type EstadoPedido } from "./pedido";

export const CHAVE_RASCUNHO = "produto-coringa:rascunho";

export function salvarRascunho(estado: EstadoPedido): void {
  try {
    window.localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(estado));
  } catch {
    // localStorage indisponível ou cota excedida — ignora silenciosamente
  }
}

export function carregarRascunho(): EstadoPedido | null {
  try {
    const bruto = window.localStorage.getItem(CHAVE_RASCUNHO);
    if (!bruto) return null;
    const dados = JSON.parse(bruto);
    if (typeof dados !== "object" || dados === null || !("pedido" in dados)) return null;
    return { ...ESTADO_INICIAL, ...dados };
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
