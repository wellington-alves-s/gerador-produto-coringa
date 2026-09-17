import { describe, it, expect } from "vitest";
import { PRODUTOS, listarProdutos } from "./index";
import type { TipoProdutoId } from "./tipos";

const IDS_ESPERADOS: TipoProdutoId[] = [
  "porta-marcenaria",
  "porta-especial",
  "porta-acm",
  "esquadria",
  "degrau-patamar-rodape",
  "outros",
];

describe("registro de produtos", () => {
  it("tem exatamente os 6 tipos esperados", () => {
    expect(Object.keys(PRODUTOS).sort()).toEqual([...IDS_ESPERADOS].sort());
  });

  it("cada config tem nome, título de documento e prazo positivo", () => {
    for (const id of IDS_ESPERADOS) {
      const config = PRODUTOS[id];
      expect(config.nome.length).toBeGreaterThan(0);
      expect(config.tituloDocumento.length).toBeGreaterThan(0);
      expect(config.prazoEntregaDias).toBeGreaterThan(0);
    }
  });

  it("cada campo declarado tem id e label não vazios", () => {
    for (const id of IDS_ESPERADOS) {
      for (const campo of PRODUTOS[id].campos) {
        expect(campo.id.length).toBeGreaterThan(0);
        expect(campo.label.length).toBeGreaterThan(0);
      }
    }
  });

  it("não há ids de campo duplicados dentro do mesmo produto", () => {
    for (const id of IDS_ESPERADOS) {
      const ids = PRODUTOS[id].campos.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("listarProdutos retorna os 6 produtos", () => {
    expect(listarProdutos()).toHaveLength(6);
  });
});
