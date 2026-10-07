import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { useEffect } from "react";
import { reducerPedido, WizardProvider, useWizard } from "./wizard-context";
import { ESTADO_INICIAL } from "./pedido";
import { criarTexto, transformacaoPadraoDaImagem, type DesenhoEstado } from "./desenho";
import { salvarRascunho, carregarRascunho } from "./wizard-storage";

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
    expect(resultado.desenho).toEqual({ elementos: [], imagem: null });
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

  it("o estado inicial vem sem anotações", () => {
    expect(ESTADO_INICIAL.desenho).toEqual({ elementos: [], imagem: null });
  });
});

describe("WizardProvider — autosave", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  function PaginaQueDisparaNoMount() {
    const { dispatch } = useWizard();
    useEffect(() => {
      dispatch({ type: "IR_PARA_ETAPA", etapa: "tipo" });
    }, [dispatch]);
    return null;
  }

  it("não perde um rascunho real mesmo quando a própria página dispara uma ação no mount, antes da recuperação ser resolvida", async () => {
    vi.useFakeTimers();
    salvarRascunho({ ...ESTADO_INICIAL, tipo: "esquadria", ultimaEtapa: "especificacoes" });

    render(
      <WizardProvider>
        <PaginaQueDisparaNoMount />
      </WizardProvider>
    );

    // Uma página real dispara IR_PARA_ETAPA no próprio mount, gerando uma
    // segunda renderização antes que o usuário decida "Continuar" ou
    // "Começar nova" no diálogo de recuperação. O autosave não pode
    // sobrescrever o rascunho real nesse meio-tempo.
    await vi.advanceTimersByTimeAsync(400);

    expect(carregarRascunho()?.ultimaEtapa).toBe("especificacoes");

    vi.useRealTimers();
  });

  it("volta a salvar normalmente depois que o usuário resolve a recuperação (Continuar)", async () => {
    vi.useFakeTimers();
    salvarRascunho({ ...ESTADO_INICIAL, tipo: "esquadria", ultimaEtapa: "especificacoes" });

    function ComRecuperacao() {
      const { dispatch } = useWizard();
      useEffect(() => {
        dispatch({ type: "IR_PARA_ETAPA", etapa: "tipo" });
        dispatch({ type: "CARREGAR_ESTADO", estado: { ...ESTADO_INICIAL, tipo: "outros" } });
      }, [dispatch]);
      return null;
    }

    render(
      <WizardProvider>
        <ComRecuperacao />
      </WizardProvider>
    );

    await vi.advanceTimersByTimeAsync(400);

    expect(carregarRascunho()?.tipo).toBe("outros");

    vi.useRealTimers();
  });
});
