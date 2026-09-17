import type { ItemBiblioteca } from "./biblioteca-tipos";

export function buscarImagens(itens: ItemBiblioteca[], termo: string): ItemBiblioteca[] {
  const termoNormalizado = termo.trim().toLowerCase();
  if (!termoNormalizado) return itens;
  return itens.filter(
    (item) =>
      item.nome.toLowerCase().includes(termoNormalizado) ||
      item.categoria.toLowerCase().includes(termoNormalizado)
  );
}

export function caminhoImagem(item: ItemBiblioteca): string {
  return `/biblioteca/produtos/${item.arquivo}`;
}
