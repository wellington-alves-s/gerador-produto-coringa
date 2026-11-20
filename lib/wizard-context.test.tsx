import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { useEffect } from "react";
import { reducerPedido, WizardProvider, useWizard } from "./wizard-context";
import { ESTADO_INICIAL } from "./pedido";
import { criarTexto, transformacaoPadraoDaImagem, type DesenhoEstado } from "./desenho";
import { CHAVE_RASCUNHO } from "./wizard-storage";

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

  it("ATUALIZAR_ESPECIFICACAO limpa campos dependentes quando a condição deixa de valer", () => {
    const comTipo = reducerPedido(ESTADO_INICIAL, { type: "DEFINIR_TIPO", tipo: "porta-marcenaria" });
    const comCava = reducerPedido(comTipo, { type: "ATUALIZAR_ESPECIFICACAO", campoId: "cava", valor: "FOLEADA" });
    const comCavaLados = reducerPedido(comCava, {
      type: "ATUALIZAR_ESPECIFICACAO",
      campoId: "cavaLados",
      valor: "1 LADO",
    });
    expect(comCavaLados.especificacoes.cavaLados).toBe("1 LADO");

    const semCava = reducerPedido(comCavaLados, { type: "ATUALIZAR_ESPECIFICACAO", campoId: "cava", valor: "" });
    expect(semCava.especificacoes.cavaLados).toBe("");
  });

  it("ATUALIZAR_ESPECIFICACAO mantém o campo dependente quando a condição continua valendo", () => {
    const comTipo = reducerPedido(ESTADO_INICIAL, { type: "DEFINIR_TIPO", tipo: "porta-marcenaria" });
    const comCava = reducerPedido(comTipo, { type: "ATUALIZAR_ESPECIFICACAO", campoId: "cava", valor: "FOLEADA" });
    const comCavaLados = reducerPedido(comCava, {
      type: "ATUALIZAR_ESPECIFICACAO",
      campoId: "cavaLados",
      valor: "1 LADO",
    });
    const trocaCava = reducerPedido(comCavaLados, {
      type: "ATUALIZAR_ESPECIFICACAO",
      campoId: "cava",
      valor: "SEM FOLEAR",
    });
    expect(trocaCava.especificacoes.cavaLados).toBe("1 LADO");
  });
});

describe("reducerPedido — desenho editável", () => {
  const texto = criarTexto({ x: 100, y: 100 }, "Medida");
  const desenho: DesenhoEstado = { elementos: [texto], imagem: transformacaoPadraoDaImagem(1.5) };
  const comDesenho = { ...ESTADO_INICIAL, tipo: "esquadria" as const, desenho };

  it("DEFINIR_DESENHO substitui o desenho inteiro", () => {
    const resultado = reducerPedido(ESTADO_INICIAL, { type: "DEFINIR_DESENHO", desenho });
    expect(resultado.desenho).toBe(desenho);
  });

  it("trocar o tipo do produto descarta as anotações e a posição da imagem", () => {
    const resultado = reducerPedido(comDesenho, { type: "DEFINIR_TIPO", tipo: "porta-acm" });
    expect(resultado.desenho).toEqual({ elementos: [], imagem: null, apagamentos: [] });
  });

  it("trocar ou remover a imagem reposiciona a imagem, mas mantém as anotações", () => {
    for (const acao of [
      { type: "DEFINIR_IMAGEM_BIBLIOTECA", bibliotecaId: "x" },
      { type: "DEFINIR_IMAGEM_UPLOAD", dataUrl: "data:image/png;base64,QUJD" },
      { type: "REMOVER_IMAGEM" },
    ] as const) {
      const resultado = reducerPedido(comDesenho, acao);
      expect(resultado.desenho.imagem).toBeNull();
      expect(resultado.desenho.elementos).toEqual([texto]);
    }
  });

  it("trocar ou remover a imagem também descarta as áreas apagadas dela (e só delas)", () => {
    const comApagamentos = {
      ...comDesenho,
      desenho: { ...desenho, apagamentos: [{ u: 0.5, v: 0.5, mw: 0.1, mh: 0.1, rot: 0 }] },
    };
    for (const acao of [
      { type: "DEFINIR_IMAGEM_BIBLIOTECA", bibliotecaId: "x" },
      { type: "DEFINIR_IMAGEM_UPLOAD", dataUrl: "data:image/png;base64,QUJD" },
      { type: "REMOVER_IMAGEM" },
    ] as const) {
      const resultado = reducerPedido(comApagamentos, acao);
      expect(resultado.desenho.apagamentos).toEqual([]);
      expect(resultado.desenho.elementos).toEqual([texto]);
    }
  });

  it("o estado inicial vem sem anotações", () => {
    expect(ESTADO_INICIAL.desenho).toEqual({ elementos: [], imagem: null, apagamentos: [] });
  });
});

describe("WizardProvider — rascunho local aposentado", () => {
  it("apaga um rascunho antigo do navegador ao montar e não grava novos (o croqui fica salvo na nuvem)", async () => {
    vi.useFakeTimers();
    window.localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify({ pedido: { cliente: "Maria" }, tipo: "esquadria" }));

    function Edita() {
      const { dispatch } = useWizard();
      useEffect(() => {
        dispatch({ type: "DEFINIR_TIPO", tipo: "outros" });
        dispatch({ type: "ATUALIZAR_PEDIDO", campo: "cliente", valor: "João" });
      }, [dispatch]);
      return null;
    }
    render(
      <WizardProvider>
        <Edita />
      </WizardProvider>
    );
    await vi.advanceTimersByTimeAsync(500);

    expect(window.localStorage.getItem(CHAVE_RASCUNHO)).toBeNull();
    vi.useRealTimers();
  });
});

describe("reducerPedido — croquiId", () => {
  it("DEFINIR_CROQUI_ID guarda o id e REINICIAR zera", () => {
    const comId = reducerPedido(ESTADO_INICIAL, { type: "DEFINIR_CROQUI_ID", id: 9 });
    expect(comId.croquiId).toBe(9);
    expect(reducerPedido(comId, { type: "REINICIAR" }).croquiId).toBeNull();
  });
});

describe("WizardProvider — salvarAgora", () => {
  type Contexto = ReturnType<typeof useWizard>;
  let ctx: Contexto;
  const fetchMock = vi.fn();

  function Sonda() {
    ctx = useWizard();
    return null;
  }
  const preparar = async (cliente = "Maria") => {
    window.localStorage.clear();
    render(
      <WizardProvider>
        <Sonda />
      </WizardProvider>
    );
    await act(async () => {
      ctx.dispatch({ type: "DEFINIR_TIPO", tipo: "esquadria" });
      ctx.dispatch({ type: "ATUALIZAR_PEDIDO", campo: "cliente", valor: cliente });
    });
  };
  const resposta = (id: number) => ({ ok: true, status: 200, json: async () => ({ id }) });
  const corpoDe = (n: number) => JSON.parse(fetchMock.mock.calls[n][1].body);

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("sem cliente preenchido não chama o servidor", async () => {
    await preparar("  ");
    await act(async () => {
      await ctx.salvarAgora();
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(ctx.statusSalvamento).toBe("ocioso");
  });

  it("cria o croqui, guarda o id e o salvamento seguinte atualiza o mesmo", async () => {
    fetchMock.mockResolvedValue(resposta(5));
    await preparar();
    await act(async () => {
      await ctx.salvarAgora();
    });
    expect(ctx.estado.croquiId).toBe(5);
    expect(ctx.statusSalvamento).toBe("salvo");
    expect(corpoDe(0).id).toBeUndefined();
    await act(async () => {
      await ctx.salvarAgora();
    });
    expect(corpoDe(1).id).toBe(5);
  });

  it("dois salvamentos disparados juntos criam um registro só (o segundo espera e atualiza)", async () => {
    let liberar: () => void = () => {};
    fetchMock.mockImplementationOnce(() => new Promise((r) => (liberar = () => r(resposta(5)))));
    fetchMock.mockResolvedValue(resposta(5));
    await preparar();
    let ambos: Promise<unknown> = Promise.resolve();
    await act(async () => {
      ambos = Promise.all([ctx.salvarAgora(), ctx.salvarAgora()]);
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      liberar();
      await ambos;
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(corpoDe(0).id).toBeUndefined();
    expect(corpoDe(1).id).toBe(5);
  });

  it("resposta que chega depois de REINICIAR não grava o id no croqui novo", async () => {
    let liberar: () => void = () => {};
    fetchMock.mockImplementationOnce(() => new Promise((r) => (liberar = () => r(resposta(5)))));
    await preparar();
    let pendente: Promise<void> = Promise.resolve();
    await act(async () => {
      pendente = ctx.salvarAgora();
      await Promise.resolve();
    });
    await act(async () => {
      ctx.dispatch({ type: "REINICIAR" });
    });
    await act(async () => {
      liberar();
      await pendente;
    });
    expect(ctx.estado.croquiId).toBeNull();
    expect(ctx.statusSalvamento).not.toBe("salvo");
  });

  it("falha do servidor vira status erro com a mensagem, sem lançar", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 413, json: async () => ({}) });
    await preparar();
    await act(async () => {
      await ctx.salvarAgora();
    });
    expect(ctx.statusSalvamento).toBe("erro");
    expect(ctx.mensagemSalvamento).toMatch(/imagens/);
    expect(ctx.estado.croquiId).toBeNull();
  });
});

describe("WizardProvider — croquiId que deixou de existir", () => {
  type Contexto = ReturnType<typeof useWizard>;
  let ctx: Contexto;
  const fetchMock = vi.fn();
  function Sonda() {
    ctx = useWizard();
    return null;
  }

  it("404 num croqui já salvo: descarta o id, recria o croqui e guarda o novo id (sem travar o salvamento)", async () => {
    window.localStorage.clear();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    render(
      <WizardProvider>
        <Sonda />
      </WizardProvider>
    );
    await act(async () => {
      ctx.dispatch({ type: "DEFINIR_TIPO", tipo: "esquadria" });
      ctx.dispatch({ type: "ATUALIZAR_PEDIDO", campo: "cliente", valor: "Maria" });
      ctx.dispatch({ type: "DEFINIR_CROQUI_ID", id: 42 });
    });
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 9 }) });

    await act(async () => {
      await ctx.salvarAgora();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).id).toBe(42);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).id).toBeUndefined();
    expect(ctx.estado.croquiId).toBe(9);
    expect(ctx.statusSalvamento).toBe("salvo");
  });
});
