import { describe, it, expect, vi, beforeEach } from "vitest";
import { obterTemaSalvo, salvarTema, resolverTemaInicial, CHAVE_TEMA } from "./tema";

beforeEach(() => {
  window.localStorage.clear();
});

describe("preferência de tema", () => {
  it("retorna null quando nada foi salvo", () => {
    expect(obterTemaSalvo()).toBeNull();
  });

  it("salva e recupera o tema escolhido", () => {
    salvarTema("escuro");
    expect(obterTemaSalvo()).toBe("escuro");
  });

  it("ignora valor inválido salvo diretamente no localStorage", () => {
    window.localStorage.setItem(CHAVE_TEMA, "roxo");
    expect(obterTemaSalvo()).toBeNull();
  });

  it("resolverTemaInicial usa o valor salvo quando existe", () => {
    salvarTema("claro");
    expect(resolverTemaInicial()).toBe("claro");
  });

  it("resolverTemaInicial cai para o preferido do sistema quando não há nada salvo", () => {
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    expect(resolverTemaInicial()).toBe("escuro");
    window.matchMedia = original;
  });
});
