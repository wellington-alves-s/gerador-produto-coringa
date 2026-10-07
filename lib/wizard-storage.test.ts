import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
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

  describe("cota do localStorage esgotada", () => {
    afterEach(() => vi.restoreAllMocks());

    const estado = {
      ...ESTADO_INICIAL,
      tipo: "outros" as const,
      imagem: { origem: "upload" as const, bibliotecaId: null, uploadDataUrl: "data:image/jpeg;base64,PRINCIPAL" },
      desenho: {
        elementos: [
          { id: "a", tipo: "imagem" as const, src: "data:image/jpeg;base64,COLADA", cx: 1, cy: 1, largura: 10, altura: 10, rotacao: 0, espelhoH: false, espelhoV: false },
          { id: "b", tipo: "texto" as const, texto: "oi", tamanhoFonte: 10, cor: "#000", negrito: false, cx: 1, cy: 1, largura: 10, altura: 10, rotacao: 0, espelhoH: false, espelhoV: false },
        ],
        imagem: null,
        apagamentos: [],
      },
    };

    function limitarTamanho(maximo: number) {
      const original = Storage.prototype.setItem;
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, chave: string, valor: string) {
        if (valor.length > maximo) throw new DOMException("cheio", "QuotaExceededError");
        return original.call(this, chave, valor);
      });
    }

    it("descarta primeiro as imagens coladas e mantém a imagem principal e o resto do desenho", () => {
      const completo = JSON.stringify(estado).length;
      limitarTamanho(completo - 10);
      salvarRascunho(estado);
      const salvo = carregarRascunho();
      expect(salvo?.imagem.uploadDataUrl).toBe("data:image/jpeg;base64,PRINCIPAL");
      expect(salvo?.desenho.elementos.map((e) => e.tipo)).toEqual(["texto"]);
    });

    it("só se faltar espaço mesmo sem as coladas é que descarta a imagem principal", () => {
      const enxuto = {
        ...estado,
        imagem: { ...estado.imagem, uploadDataUrl: null },
        desenho: { ...estado.desenho, elementos: estado.desenho.elementos.filter((e) => e.tipo !== "imagem") },
      };
      limitarTamanho(JSON.stringify(enxuto).length);
      salvarRascunho(estado);
      const salvo = carregarRascunho();
      expect(salvo?.imagem.uploadDataUrl).toBeNull();
      expect(salvo?.desenho.elementos.map((e) => e.tipo)).toEqual(["texto"]);
    });
  });
});
