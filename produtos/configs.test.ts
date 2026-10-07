import { describe, it, expect } from "vitest";
import { PRODUTOS } from "./index";

describe("configs de produto — conteúdo específico", () => {
  it("porta-marcenaria: madeira é opção fixa Imbuia/Cedro/Tauari, obrigatória, com label Padrão de madeira", () => {
    const campo = PRODUTOS["porta-marcenaria"].campos.find((c) => c.id === "madeira");
    expect(campo?.tipo).toBe("opcao-unica");
    expect(campo?.label).toBe("Padrão de madeira");
    expect(campo?.obrigatorio).toBe(true);
    expect(campo && "opcoes" in campo ? campo.opcoes : []).toEqual(["IMBUIA", "CEDRO", "TAUARI"]);
  });

  it("porta-marcenaria: espessura da folha é obrigatória", () => {
    const campo = PRODUTOS["porta-marcenaria"].campos.find((c) => c.id === "espessuraFolha");
    expect(campo?.obrigatorio).toBe(true);
  });

  it("porta-marcenaria: cavaLados depende de cava ser FOLEADA ou SEM FOLEAR e omite o label no documento", () => {
    const campo = PRODUTOS["porta-marcenaria"].campos.find((c) => c.id === "cavaLados");
    expect(campo?.dependeDe).toEqual({ campoId: "cava", valores: ["FOLEADA", "SEM FOLEAR"] });
    expect(campo?.ocultarLabelDocumento).toBe(true);
  });

  it("porta-marcenaria: não tem campo de caixa de batente (é só folha)", () => {
    const ids = PRODUTOS["porta-marcenaria"].campos.map((c) => c.id);
    expect(ids).not.toContain("caixaBatente");
  });

  it("porta-especial: tem caixa de batente e padrão de madeira livre, obrigatório", () => {
    const ids = PRODUTOS["porta-especial"].campos.map((c) => c.id);
    expect(ids).toContain("caixaBatente");
    const padrao = PRODUTOS["porta-especial"].campos.find((c) => c.id === "padraoMadeira");
    expect(padrao?.tipo).toBe("texto");
    expect(padrao?.obrigatorio).toBe(true);
  });

  it("porta-especial: espessura da folha é sempre obrigatória", () => {
    const campo = PRODUTOS["porta-especial"].campos.find((c) => c.id === "espessuraFolha");
    expect(campo?.obrigatorio).toBe(true);
  });

  it("porta-especial: não tem mais o campo Tipo de friso", () => {
    const ids = PRODUTOS["porta-especial"].campos.map((c) => c.id);
    expect(ids).not.toContain("tipoFriso");
  });

  it("porta-especial: caixa do batente, espessura da folha e medidas de guarnição são em cm com 1 casa decimal", () => {
    for (const id of ["caixaBatente", "espessuraFolha", "medidasGuarnicao"]) {
      const campo = PRODUTOS["porta-especial"].campos.find((c) => c.id === id);
      expect(campo?.tipo).toBe("medida");
      expect(campo && "unidade" in campo ? campo.unidade : null).toBe("cm");
      expect(campo && "casasDecimais" in campo ? campo.casasDecimais : null).toBe(1);
    }
  });

  it("porta-especial: caixa do batente e medidas de guarnição têm 2 casas inteiras (até 99,9); espessura fica com 1", () => {
    for (const id of ["caixaBatente", "medidasGuarnicao"]) {
      const campo = PRODUTOS["porta-especial"].campos.find((c) => c.id === id);
      expect(campo && "casasInteiras" in campo ? campo.casasInteiras : null).toBe(2);
    }

    const espessuraFolha = PRODUTOS["porta-especial"].campos.find((c) => c.id === "espessuraFolha");
    expect(espessuraFolha && "casasInteiras" in espessuraFolha ? espessuraFolha.casasInteiras : undefined).toBeUndefined();
  });

  it("porta-especial: caixa do batente, medidas de guarnição, lados e abertura só são obrigatórios quando Tipo é CONJUNTO", () => {
    for (const id of ["caixaBatente", "medidasGuarnicao", "ladosGuarnicao", "tipoAbertura", "ladoAbertura"]) {
      const campo = PRODUTOS["porta-especial"].campos.find((c) => c.id === id);
      expect(campo?.dependeDe).toEqual({ campoId: "tipoFolha", valores: ["CONJUNTO"] });
    }
  });

  it("porta-especial: tipo e lado de abertura são seleção única com as opções do formulário físico", () => {
    const tipoAbertura = PRODUTOS["porta-especial"].campos.find((c) => c.id === "tipoAbertura");
    expect(tipoAbertura?.tipo).toBe("opcao-unica");
    expect(tipoAbertura && "opcoes" in tipoAbertura ? tipoAbertura.opcoes : []).toEqual([
      "GIRO",
      "PIVOTANTE",
      "CAMARÃO",
    ]);

    const ladoAbertura = PRODUTOS["porta-especial"].campos.find((c) => c.id === "ladoAbertura");
    expect(ladoAbertura?.tipo).toBe("opcao-unica");
    expect(ladoAbertura && "opcoes" in ladoAbertura ? ladoAbertura.opcoes : []).toEqual([
      "ESQUERDO",
      "DIREITO",
      "CENTRAL",
    ]);
  });

  it("porta-acm: prazo de entrega é 90 dias e tem campo de cor do ACM", () => {
    expect(PRODUTOS["porta-acm"].prazoEntregaDias).toBe(90);
    const ids = PRODUTOS["porta-acm"].campos.map((c) => c.id);
    expect(ids).toContain("corAcm");
    expect(ids).not.toContain("padraoMadeira");
  });

  it("porta-acm: caixa do batente, medidas de guarnição, lados e abertura só são obrigatórios quando Tipo é CONJUNTO, como na porta-especial", () => {
    for (const id of ["caixaBatente", "medidasGuarnicao", "ladosGuarnicao", "tipoAbertura", "ladoAbertura"]) {
      const campo = PRODUTOS["porta-acm"].campos.find((c) => c.id === id);
      expect(campo?.dependeDe).toEqual({ campoId: "tipoFolha", valores: ["CONJUNTO"] });
    }
  });

  it("porta-acm: espessura da folha é sempre obrigatória, como na porta-especial", () => {
    const campo = PRODUTOS["porta-acm"].campos.find((c) => c.id === "espessuraFolha");
    expect(campo?.obrigatorio).toBe(true);
  });

  it("porta-acm: caixa do batente, espessura da folha e medidas de guarnição são em cm, com 1 casa decimal", () => {
    for (const id of ["caixaBatente", "espessuraFolha", "medidasGuarnicao"]) {
      const campo = PRODUTOS["porta-acm"].campos.find((c) => c.id === id);
      expect(campo?.tipo).toBe("medida");
      expect(campo && "unidade" in campo ? campo.unidade : null).toBe("cm");
      expect(campo && "casasDecimais" in campo ? campo.casasDecimais : null).toBe(1);
    }
  });

  it("porta-acm: caixa do batente e medidas de guarnição têm 2 casas inteiras (até 99,9), como na porta-especial", () => {
    for (const id of ["caixaBatente", "medidasGuarnicao"]) {
      const campo = PRODUTOS["porta-acm"].campos.find((c) => c.id === id);
      expect(campo && "casasInteiras" in campo ? campo.casasInteiras : null).toBe(2);
    }
  });

  it("porta-acm: tipo e lado de abertura são seleção única, como na porta-especial", () => {
    const tipoAbertura = PRODUTOS["porta-acm"].campos.find((c) => c.id === "tipoAbertura");
    expect(tipoAbertura?.tipo).toBe("opcao-unica");
    expect(tipoAbertura && "opcoes" in tipoAbertura ? tipoAbertura.opcoes : []).toEqual([
      "GIRO",
      "PIVOTANTE",
      "CAMARÃO",
    ]);

    const ladoAbertura = PRODUTOS["porta-acm"].campos.find((c) => c.id === "ladoAbertura");
    expect(ladoAbertura?.tipo).toBe("opcao-unica");
    expect(ladoAbertura && "opcoes" in ladoAbertura ? ladoAbertura.opcoes : []).toEqual([
      "ESQUERDO",
      "DIREITO",
      "CENTRAL",
    ]);
  });

  it("esquadria: padrão de madeira é sempre obrigatório, como na porta-especial", () => {
    const campo = PRODUTOS.esquadria.campos.find((c) => c.id === "padraoMadeira");
    expect(campo?.obrigatorio).toBe(true);
  });

  it("esquadria: caixa e medidas de guarnição são em cm com 1 casa decimal e 2 casas inteiras, como na porta-especial", () => {
    for (const id of ["caixa", "medidasGuarnicao"]) {
      const campo = PRODUTOS.esquadria.campos.find((c) => c.id === id);
      expect(campo?.tipo).toBe("medida");
      expect(campo && "unidade" in campo ? campo.unidade : null).toBe("cm");
      expect(campo && "casasDecimais" in campo ? campo.casasDecimais : null).toBe(1);
      expect(campo && "casasInteiras" in campo ? campo.casasInteiras : null).toBe(2);
    }
  });

  it("esquadria: altura, largura, caixa e padrão de madeira ficam na mesma linha do documento", () => {
    const linhas = ["altura", "largura", "caixa", "padraoMadeira"].map(
      (id) => PRODUTOS.esquadria.campos.find((c) => c.id === id)?.linha
    );
    expect(new Set(linhas).size).toBe(1);
    expect(linhas[0]).toBeDefined();
  });

  it("esquadria: medidas de guarnição/lados, ferragem/acabamento, e tipo/lado de abertura ficam cada par na mesma linha", () => {
    const pares = [
      ["medidasGuarnicao", "ladosGuarnicao"],
      ["comSemFerragem", "acabamentoFerragem"],
      ["tipoAbertura", "ladoAbertura"],
    ];
    const todasAsLinhas = new Set<number | undefined>();
    for (const [a, b] of pares) {
      const linhaA = PRODUTOS.esquadria.campos.find((c) => c.id === a)?.linha;
      const linhaB = PRODUTOS.esquadria.campos.find((c) => c.id === b)?.linha;
      expect(linhaA).toBeDefined();
      expect(linhaA).toBe(linhaB);
      todasAsLinhas.add(linhaA);
    }
    expect(todasAsLinhas.size).toBe(3);
  });

  it("esquadria: caixa, medidas de guarnição, ferragem, tipo de palheta, tipo e lado de abertura são obrigatórios", () => {
    for (const id of ["caixa", "medidasGuarnicao", "comSemFerragem", "tipoPalheta", "tipoAbertura", "ladoAbertura"]) {
      const campo = PRODUTOS.esquadria.campos.find((c) => c.id === id);
      expect(campo?.obrigatorio).toBe(true);
    }
  });

  it("esquadria: categoria tem 4 opções, com Panorâmico/Semi-Panorâmico/Quadriculado mutuamente excludentes e Veneziana livre", () => {
    const campo = PRODUTOS.esquadria.campos.find((c) => c.id === "categoria");
    expect(campo?.tipo).toBe("multipla-escolha");
    expect(campo && "opcoes" in campo ? campo.opcoes : []).toEqual([
      "PANORÂMICO",
      "SEMI-PANORÂMICO",
      "QUADRICULADO",
      "VENEZIANA",
    ]);
    expect(campo && "gruposExcludentes" in campo ? campo.gruposExcludentes : []).toEqual([
      ["PANORÂMICO", "SEMI-PANORÂMICO", "QUADRICULADO"],
    ]);
  });

  it("esquadria: todos os campos de opção mostram só as marcadas no documento (evita poluir a seção de especificações)", () => {
    for (const id of [
      "categoria",
      "ladosGuarnicao",
      "tipoPalheta",
      "formatoEsquadria",
      "comSemFerragem",
      "acabamentoFerragem",
      "tipoAbertura",
      "ladoAbertura",
      "vidros",
    ]) {
      const campo = PRODUTOS.esquadria.campos.find((c) => c.id === id);
      expect(campo?.exibirApenasSelecionadas).toBe(true);
    }
  });

  it("esquadria: vidros só é obrigatório quando a categoria tem Panorâmico, Semi-Panorâmico ou Quadriculado (não só Veneziana)", () => {
    const campo = PRODUTOS.esquadria.campos.find((c) => c.id === "vidros");
    expect(campo?.dependeDe).toEqual({
      campoId: "categoria",
      valores: ["PANORÂMICO", "SEMI-PANORÂMICO", "QUADRICULADO"],
    });
    expect(campo && "opcoes" in campo ? campo.opcoes : []).toEqual([
      "CONSIDERAR QUANTIDADE DE VIDROS DO DESENHO",
      "FAZER QUANTIDADE E TAMANHOS PROPORCIONAIS ÀS MEDIDAS DA PEÇA",
      "QUANTIDADES E TAMANHOS A CRITÉRIO DA FÁBRICA",
    ]);
  });

  it("esquadria: tipo de palheta é seleção única entre Francesa, Semi-Portuguesa e Reta", () => {
    const campo = PRODUTOS.esquadria.campos.find((c) => c.id === "tipoPalheta");
    expect(campo?.tipo).toBe("opcao-unica");
    expect(campo && "opcoes" in campo ? campo.opcoes : []).toEqual(["FRANCESA", "SEMI-PORTUGUESA", "RETA"]);
  });

  it("esquadria: formatoEsquadria (Reto/Arco) substitui o antigo formatoPalheta, que era um label errado", () => {
    const ids = PRODUTOS.esquadria.campos.map((c) => c.id);
    expect(ids).not.toContain("formatoPalheta");
    const campo = PRODUTOS.esquadria.campos.find((c) => c.id === "formatoEsquadria");
    expect(campo?.label).toBe("Formato da esquadria");
    expect(campo && "opcoes" in campo ? campo.opcoes : []).toEqual(["RETO", "ARCO"]);
  });

  it("esquadria: acabamento da ferragem é seleção única entre Cromado, LO e Preto, exigido só quando Ferragem é COM FERRAGENS", () => {
    const campo = PRODUTOS.esquadria.campos.find((c) => c.id === "acabamentoFerragem");
    expect(campo?.tipo).toBe("opcao-unica");
    expect(campo && "opcoes" in campo ? campo.opcoes : []).toEqual(["CROMADO", "LO", "PRETO"]);
    expect(campo?.dependeDe).toEqual({ campoId: "comSemFerragem", valores: ["COM FERRAGENS"] });
  });

  it("esquadria: tipo de abertura tem a lista completa de opções do formulário físico", () => {
    const campo = PRODUTOS.esquadria.campos.find((c) => c.id === "tipoAbertura");
    expect(campo && "opcoes" in campo ? campo.opcoes : []).toEqual([
      "CORRER",
      "ABRIR/ABRIR",
      "CORRER/ABRIR",
      "PANTOGRÁFICA",
      "CAMARÃO",
      "GIRO",
      "PIVOTANTE",
      "BASCULANTE",
      "MAX-AR",
      "GUILHOTINA/ABRIR",
      "BY WINDOW",
    ]);
  });

  it("esquadria: lado de abertura tem Esquerda, Direita, Central e Banda louca", () => {
    const campo = PRODUTOS.esquadria.campos.find((c) => c.id === "ladoAbertura");
    expect(campo && "opcoes" in campo ? campo.opcoes : []).toEqual(["ESQUERDA", "DIREITA", "CENTRAL", "BANDA LOUCA"]);
  });

  it("degrau-patamar-rodape: tem os 5 campos (Peça + 4 combinados), todos obrigatórios", () => {
    const campos = PRODUTOS["degrau-patamar-rodape"].campos;
    expect(campos).toHaveLength(5);
    expect(campos.every((c) => c.obrigatorio)).toBe(true);
  });

  it("degrau-patamar-rodape: Peça é opção única Degrau/Patamar/Rodapé", () => {
    const campo = PRODUTOS["degrau-patamar-rodape"].campos.find((c) => c.id === "tipoPeca");
    expect(campo?.tipo).toBe("opcao-unica");
    expect(campo && "opcoes" in campo ? campo.opcoes : []).toEqual(["DEGRAU", "PATAMAR", "RODAPÉ"]);
  });

  it("degrau-patamar-rodape: espessura é em cm com 1 casa decimal e 1 casa inteira", () => {
    const campo = PRODUTOS["degrau-patamar-rodape"].campos.find((c) => c.id === "espessura");
    expect(campo?.tipo).toBe("medida");
    expect(campo && "unidade" in campo ? campo.unidade : null).toBe("cm");
    expect(campo && "casasDecimais" in campo ? campo.casasDecimais : null).toBe(1);
    expect(campo && "casasInteiras" in campo ? campo.casasInteiras : undefined).toBeUndefined();
  });

  it("degrau-patamar-rodape: régua horizontal usa o campo comprimento (rótulo Comprimento) e a vertical usa largura (rótulo Largura)", () => {
    const config = PRODUTOS["degrau-patamar-rodape"];
    expect(config.campoLargura).toBe("comprimento");
    expect(config.campoAltura).toBe("largura");
    expect(config.rotuloCampoLargura).toBe("Comprimento");
    expect(config.rotuloCampoAltura).toBe("Largura");
  });

  it("outros: tem Detalhes, Altura e Largura, nenhum obrigatório", () => {
    expect(PRODUTOS.outros.campos.map((c) => c.id)).toEqual(["detalhes", "altura", "largura"]);
    expect(PRODUTOS.outros.campos.every((c) => !c.obrigatorio)).toBe(true);
    expect(PRODUTOS.outros.campoLargura).toBe("largura");
    expect(PRODUTOS.outros.campoAltura).toBe("altura");
  });
});
