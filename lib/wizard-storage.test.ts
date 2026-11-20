import { describe, it, expect, beforeEach } from "vitest";
import { limparRascunho, CHAVE_RASCUNHO } from "./wizard-storage";

beforeEach(() => {
  window.localStorage.clear();
});

describe("wizard-storage (rascunho local aposentado)", () => {
  it("limparRascunho apaga o que uma versão antiga deixou no navegador", () => {
    window.localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify({ pedido: { cliente: "Maria" } }));
    limparRascunho();
    expect(window.localStorage.getItem(CHAVE_RASCUNHO)).toBeNull();
  });

  it("não falha quando não há nada salvo", () => {
    expect(() => limparRascunho()).not.toThrow();
  });
});
