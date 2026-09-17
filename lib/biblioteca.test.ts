import { describe, it, expect } from "vitest";
import { buscarImagens, caminhoImagem } from "./biblioteca";
import type { ItemBiblioteca } from "./biblioteca-tipos";

const ITENS: ItemBiblioteca[] = [
  { id: "porta-arco", nome: "Porta Balcão Arco PF", categoria: "porta", arquivo: "porta-arco.jpg" },
  { id: "painel-solido", nome: "Painel Sólido Decorativo", categoria: "painel", arquivo: "painel-solido.jpg" },
];

describe("biblioteca de imagens", () => {
  it("sem termo de busca retorna todos os itens", () => {
    expect(buscarImagens(ITENS, "")).toEqual(ITENS);
  });

  it("filtra por nome, sem diferenciar maiúsculas/minúsculas", () => {
    expect(buscarImagens(ITENS, "arco")).toEqual([ITENS[0]]);
  });

  it("filtra por categoria", () => {
    expect(buscarImagens(ITENS, "painel")).toEqual([ITENS[1]]);
  });

  it("caminhoImagem monta o caminho público do arquivo", () => {
    expect(caminhoImagem(ITENS[0])).toBe("/biblioteca/produtos/porta-arco.jpg");
  });
});
