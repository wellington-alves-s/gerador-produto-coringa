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

  it("rascunhos antigos, sem o desenho ou sem os apagamentos, ganham os valores padrão", () => {
    const { desenho: _semDesenho, ...antigo } = { ...ESTADO_INICIAL, tipo: "esquadria" as const };
    void _semDesenho;
    window.localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(antigo));
    expect(carregarRascunho()?.desenho).toEqual({ elementos: [], imagem: null, apagamentos: [] });

    window.localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify({ ...antigo, desenho: { elementos: [], imagem: null } }));
    expect(carregarRascunho()?.desenho.apagamentos).toEqual([]);
  });

  it("preserva os apagamentos salvos", () => {
    const apagamentos = [{ u: 0.5, v: 0.5, mw: 0.1, mh: 0.1, rot: 0 }];
    salvarRascunho({ ...ESTADO_INICIAL, tipo: "outros", desenho: { elementos: [], imagem: null, apagamentos } });
    expect(carregarRascunho()?.desenho.apagamentos).toEqual(apagamentos);
  });
});
