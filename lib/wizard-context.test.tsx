import { describe, it, expect } from "vitest";
import { reducerPedido } from "./wizard-context";
import { ESTADO_INICIAL } from "./pedido";

describe("reducerPedido", () => {
  it("DEFINIR_TIPO troca o tipo e limpa especificações antigas", () => {
    const comEspec = reducerPedido(ESTADO_INICIAL, {
      type: "ATUALIZAR_ESPECIFICACAO",
      campoId: "altura",
      valor: "2100",
    });
    const resultado = reducerPedido(comEspec, { type: "DEFINIR_TIPO", tipo: "esquadria" });
    expect(resultado.tipo).toBe("esquadria");
    expect(resultado.especificacoes).toEqual({});
  });

  it("ATUALIZAR_PEDIDO atualiza só o campo informado", () => {
    const resultado = reducerPedido(ESTADO_INICIAL, {
      type: "ATUALIZAR_PEDIDO",
      campo: "cliente",
      valor: "João da Silva",
    });
    expect(resultado.pedido.cliente).toBe("João da Silva");
    expect(resultado.pedido.vendedor).toBe("");
  });

  it("DEFINIR_IMAGEM_BIBLIOTECA limpa upload avulso anterior", () => {
    const comUpload = reducerPedido(ESTADO_INICIAL, {
      type: "DEFINIR_IMAGEM_UPLOAD",
      dataUrl: "data:image/jpeg;base64,ABC",
    });
    const resultado = reducerPedido(comUpload, {
      type: "DEFINIR_IMAGEM_BIBLIOTECA",
      bibliotecaId: "porta-x",
    });
    expect(resultado.imagem).toEqual({ origem: "biblioteca", bibliotecaId: "porta-x", uploadDataUrl: null });
  });

  it("IR_PARA_ETAPA atualiza a última etapa visitada", () => {
    const resultado = reducerPedido(ESTADO_INICIAL, { type: "IR_PARA_ETAPA", etapa: "imagem" });
    expect(resultado.ultimaEtapa).toBe("imagem");
  });

  it("REINICIAR volta ao estado inicial", () => {
    const alterado = reducerPedido(ESTADO_INICIAL, { type: "ATUALIZAR_PEDIDO", campo: "cliente", valor: "X" });
    expect(reducerPedido(alterado, { type: "REINICIAR" })).toEqual(ESTADO_INICIAL);
  });
});
