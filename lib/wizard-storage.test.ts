import { describe, it, expect, beforeEach } from "vitest";
import {
  salvarRascunho,
  carregarRascunho,
  limparRascunho,
  existeRascunho,
  CHAVE_RASCUNHO,
} from "./wizard-storage";
import { ESTADO_INICIAL } from "./pedido";

beforeEach(() => {
  window.localStorage.clear();
});

describe("wizard-storage", () => {
  it("não existe rascunho antes de salvar nada", () => {
    expect(existeRascunho()).toBe(false);
    expect(carregarRascunho()).toBeNull();
  });

  it("salva e recupera um estado", () => {
    const estado = { ...ESTADO_INICIAL, tipo: "esquadria" as const };
    salvarRascunho(estado);
    expect(carregarRascunho()).toEqual(estado);
    expect(existeRascunho()).toBe(true);
  });

  it("limparRascunho remove o que estava salvo", () => {
    salvarRascunho({ ...ESTADO_INICIAL, tipo: "outros" });
    limparRascunho();
    expect(carregarRascunho()).toBeNull();
  });

  it("ignora um valor corrompido salvo diretamente na chave", () => {
    window.localStorage.setItem(CHAVE_RASCUNHO, "{not json");
    expect(carregarRascunho()).toBeNull();
  });
});
