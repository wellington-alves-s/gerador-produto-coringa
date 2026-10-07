import { describe, it, expect } from "vitest";
import {
  detectarPecaDegrau,
  pecaDoPedido,
  limparDescricao,
  montarDescricaoImagem,
  montarPromptImagem,
  podeGerarImagem,
} from "./prompt-imagem";
import { ESTADO_INICIAL, type EstadoPedido } from "./pedido";

function estadoDe(tipo: NonNullable<EstadoPedido["tipo"]>, especificacoes: Record<string, string> = {}, descricao = ""): EstadoPedido {
  return { ...ESTADO_INICIAL, tipo, especificacoes, pedido: { ...ESTADO_INICIAL.pedido, descricao } };
}

describe("podeGerarImagem", () => {
  it("vale para esquadria, portas e degrau/patamar/rodapé, mas não para Outros nem sem tipo", () => {
    for (const tipo of ["esquadria", "porta-marcenaria", "porta-especial", "porta-acm", "degrau-patamar-rodape"] as const) {
      expect(podeGerarImagem(tipo)).toBe(true);
    }
    expect(podeGerarImagem("outros")).toBe(false);
    expect(podeGerarImagem(null)).toBe(false);
  });

  it("montarDescricaoImagem devolve null para tipos sem geração", () => {
    expect(montarDescricaoImagem(estadoDe("outros"))).toBeNull();
    expect(montarPromptImagem(estadoDe("outros"))).toBeNull();
  });
});

describe("esquadria", () => {
  const estado = estadoDe(
    "esquadria",
    {
      categoria: "VENEZIANA",
      altura: "1200",
      largura: "1500",
      padraoMadeira: "Cedro",
      tipoAbertura: "CORRER",
      ladoAbertura: "CENTRAL",
      comSemFerragem: "COM FERRAGENS",
      acabamentoFerragem: "LO",
      formatoEsquadria: "RETO",
    },
    "Janela de sala com 4 folhas"
  );

  it("monta as seções a partir das opções marcadas", () => {
    const d = montarDescricaoImagem(estado) as Record<string, Record<string, unknown>>;
    expect(d.detalhes_do_objeto.tipo_especifico).toBe("Esquadria veneziana");
    expect(d.materiais_e_acabamentos.padrao_de_madeira).toBe("Cedro");
    expect(d.estrutura_e_componentes.sistema_de_movimentacao).toEqual({ mecanismo: "correr", lado_de_abertura: "central" });
    expect(d.ferragens_visiveis.acabamento).toMatch(/Latão oxidado/);
    expect(d.observacoes_do_pedido.descricao_do_produto).toBe("Janela de sala com 4 folhas");
    expect(d.fundo).toEqual({ tipo: "Recortado", cor: "Branco" });
  });

  it("passa só a proporção, nunca as medidas absolutas", () => {
    const json = JSON.stringify(montarDescricaoImagem(estado));
    expect(json).toMatch(/Orientação horizontal/);
    expect(json).not.toMatch(/1,200|1,500|1200|1500/);
  });

  it("SEM FERRAGENS vira observação e omite acabamento", () => {
    const d = montarDescricaoImagem(estadoDe("esquadria", { comSemFerragem: "SEM FERRAGENS", acabamentoFerragem: "CROMADO" })) as Record<string, unknown>;
    expect(d.ferragens_visiveis).toEqual({ observacao: "Sem ferragens visíveis" });
  });

  it("omite campos não preenchidos (sem strings vazias nem objetos vazios)", () => {
    const d = montarDescricaoImagem(estadoDe("esquadria")) as Record<string, unknown>;
    expect(d.ferragens_visiveis).toBeUndefined();
    expect(d.estrutura_e_componentes).toEqual({ caixilharia: { descricao: "Moldura perimetral externa robusta, em madeira" } });
    expect(JSON.stringify(d)).not.toMatch(/""|\{\}/);
  });
});

describe("portas", () => {
  it("porta-marcenaria: madeira, tipo de folha, friso e cava", () => {
    const d = montarDescricaoImagem(
      estadoDe("porta-marcenaria", {
        madeira: "IMBUIA",
        espessuraFolha: "35MM",
        tipoFolha: "FRISADA|RASGADA",
        friso: "2 LADOS",
        cava: "FOLEADA",
        cavaLados: "1 LADO",
      })
    ) as Record<string, Record<string, Record<string, unknown>>>;
    expect((d.materiais_e_acabamentos as Record<string, unknown>).padrao_de_madeira).toBe("imbuia");
    expect(d.estrutura_e_componentes.folha.estilo).toBe("frisada e rasgada");
    expect(d.estrutura_e_componentes.folha.friso).toBe("Friso em 2 lados");
    expect(d.estrutura_e_componentes.folha.cava).toBe("Cava foleada em 1 lado");
  });

  it("porta-especial CONJUNTO inclui batente e guarnição; SÓ FOLHA não", () => {
    const conjunto = montarDescricaoImagem(estadoDe("porta-especial", { tipoFolha: "CONJUNTO", ladosGuarnicao: "DOIS LADOS" })) as Record<string, Record<string, unknown>>;
    expect(conjunto.estrutura_e_componentes.batente_e_guarnicao).toBeDefined();

    const soFolha = montarDescricaoImagem(estadoDe("porta-especial", { tipoFolha: "SÓ FOLHA" })) as Record<string, Record<string, unknown>>;
    expect(soFolha.estrutura_e_componentes?.batente_e_guarnicao).toBeUndefined();
  });

  it("porta-acm usa ACM como material e a cor informada", () => {
    const d = montarDescricaoImagem(estadoDe("porta-acm", { corAcm: "Preto fosco" })) as Record<string, Record<string, unknown>>;
    expect(d.detalhes_do_objeto.categoria).toMatch(/ACM/);
    expect(d.materiais_e_acabamentos.cor).toBe("Preto fosco");
  });
});

describe("degrau / patamar / rodapé", () => {
  it("detecta a peça pela descrição, ignorando acento e caixa; padrão é degrau", () => {
    expect(detectarPecaDegrau("Rodapé de 15cm")).toBe("rodape");
    expect(detectarPecaDegrau("RODAPE")).toBe("rodape");
    expect(detectarPecaDegrau("Patamar da escada")).toBe("patamar");
    expect(detectarPecaDegrau("Degrau para escada")).toBe("degrau");
    expect(detectarPecaDegrau("")).toBe("degrau");
  });

  it("usa a estrutura descricao_da_imagem das referências, com fundo recortado branco", () => {
    const d = montarDescricaoImagem(estadoDe("degrau-patamar-rodape", { tipoPeca: "RODAPÉ", tipoMadeira: "Cedro" })) as {
      descricao_da_imagem: { assunto_principal: string; detalhes_do_objeto: Record<string, string>; fundo: unknown };
    };
    expect(d.descricao_da_imagem.assunto_principal).toBe("Rodapé de madeira");
    expect(d.descricao_da_imagem.detalhes_do_objeto.acabamento).toBe("Rebordo superior arredondado (boleado)");
    expect(d.descricao_da_imagem.detalhes_do_objeto.material).toBe("Madeira (cedro)");
    expect(d.descricao_da_imagem.fundo).toEqual({ tipo: "Recortado", cor: "Branco" });
  });

  it("o campo Peça manda mesmo que a descrição cite outra peça", () => {
    expect(pecaDoPedido(estadoDe("degrau-patamar-rodape", { tipoPeca: "DEGRAU" }, "Rodapé de 15cm"))).toBe("degrau");
    expect(pecaDoPedido(estadoDe("degrau-patamar-rodape", { tipoPeca: "RODAPÉ" }))).toBe("rodape");
    expect(pecaDoPedido(estadoDe("degrau-patamar-rodape", { tipoPeca: "PATAMAR" }))).toBe("patamar");
  });

  it("sem o campo Peça (rascunho antigo), cai para a detecção pela descrição", () => {
    expect(pecaDoPedido(estadoDe("degrau-patamar-rodape", {}, "Rodapé"))).toBe("rodape");
  });

  it("degrau usa a face frontal e o corte lateral", () => {
    const d = montarDescricaoImagem(estadoDe("degrau-patamar-rodape", { tipoPeca: "DEGRAU" })) as {
      descricao_da_imagem: { assunto_principal: string; detalhes_do_objeto: Record<string, string> };
    };
    expect(d.descricao_da_imagem.assunto_principal).toBe("Degrau de madeira");
    expect(d.descricao_da_imagem.detalhes_do_objeto.posicionamento).toMatch(/face frontal ampla/);
  });

  it("patamar usa vista superior", () => {
    const d = montarDescricaoImagem(estadoDe("degrau-patamar-rodape", { tipoPeca: "PATAMAR" })) as {
      descricao_da_imagem: { detalhes_do_objeto: Record<string, string> };
    };
    expect(d.descricao_da_imagem.detalhes_do_objeto.posicionamento).toMatch(/Vista superior/);
  });
});

describe("orientação e alongamento do degrau/patamar/rodapé", () => {
  type Detalhes = { orientacao: string; proporcao?: string; posicionamento: string };
  const detalhes = (e: EstadoPedido) =>
    (montarDescricaoImagem(e) as { descricao_da_imagem: { detalhes_do_objeto: Detalhes } }).descricao_da_imagem.detalhes_do_objeto;

  it("sempre manda deitar a peça na horizontal", () => {
    for (const tipoPeca of ["DEGRAU", "PATAMAR", "RODAPÉ"]) {
      const d = detalhes(estadoDe("degrau-patamar-rodape", { tipoPeca }));
      expect(d.orientacao).toMatch(/Horizontal/);
      expect(d.orientacao).toMatch(/nunca aparece em pé/);
    }
    expect(detalhes(estadoDe("degrau-patamar-rodape", { tipoPeca: "DEGRAU" })).posicionamento).toMatch(/deitada na horizontal/);
  });

  it("usa a proporção real comprimento ÷ largura quando ela é maior que o mínimo", () => {
    const d = detalhes(estadoDe("degrau-patamar-rodape", { tipoPeca: "DEGRAU", comprimento: "1200", largura: "0300" }));
    expect(d.proporcao).toMatch(/cerca de 4,0 vezes a largura/);
  });

  it("sem medidas (ou com medidas quase quadradas), aplica o alongamento mínimo do degrau e do rodapé", () => {
    expect(detalhes(estadoDe("degrau-patamar-rodape", { tipoPeca: "DEGRAU" })).proporcao).toMatch(/cerca de 3,0 vezes/);
    expect(detalhes(estadoDe("degrau-patamar-rodape", { tipoPeca: "RODAPÉ" })).proporcao).toMatch(/cerca de 6,0 vezes/);
    expect(
      detalhes(estadoDe("degrau-patamar-rodape", { tipoPeca: "DEGRAU", comprimento: "0400", largura: "0400" })).proporcao
    ).toMatch(/cerca de 3,0 vezes/);
  });

  it("limita o alongamento a 12 vezes e não força alongamento no patamar sem medidas", () => {
    expect(
      detalhes(estadoDe("degrau-patamar-rodape", { tipoPeca: "RODAPÉ", comprimento: "3000", largura: "0050" })).proporcao
    ).toMatch(/cerca de 12,0 vezes/);
    expect(detalhes(estadoDe("degrau-patamar-rodape", { tipoPeca: "PATAMAR" })).proporcao).toBeUndefined();
  });
});

describe("espessura do degrau/patamar/rodapé", () => {
  const espessura = (e: EstadoPedido) =>
    (montarDescricaoImagem(e) as { descricao_da_imagem: { detalhes_do_objeto: { espessura: string; formato: string } } })
      .descricao_da_imagem.detalhes_do_objeto;

  it("calcula a espessura (cm) como percentual da largura (m)", () => {
    // 4,0 cm de espessura para 0,300 m de largura ≈ 13%
    const d = espessura(estadoDe("degrau-patamar-rodape", { tipoPeca: "DEGRAU", largura: "0300", espessura: "040" }));
    expect(d.espessura).toMatch(/cerca de 13% da largura/);
  });

  it("sem medidas usa um percentual padrão baixo por peça", () => {
    expect(espessura(estadoDe("degrau-patamar-rodape", { tipoPeca: "DEGRAU" })).espessura).toMatch(/cerca de 12%/);
    expect(espessura(estadoDe("degrau-patamar-rodape", { tipoPeca: "RODAPÉ" })).espessura).toMatch(/cerca de 10%/);
    expect(espessura(estadoDe("degrau-patamar-rodape", { tipoPeca: "PATAMAR" })).espessura).toMatch(/cerca de 8%/);
  });

  it("limita o percentual em 25% e descreve a peça como fina, não como bloco", () => {
    const d = espessura(estadoDe("degrau-patamar-rodape", { tipoPeca: "DEGRAU", largura: "0100", espessura: "500" }));
    expect(d.espessura).toMatch(/cerca de 25%/);
    expect(d.formato).toMatch(/fina/);
    expect(d.formato).toMatch(/não é um bloco/);
  });
});

describe("montarPromptImagem", () => {
  it("inclui a instrução e o JSON, e menciona a referência só quando existe", () => {
    const estado = estadoDe("esquadria", { categoria: "VENEZIANA" });
    const sem = montarPromptImagem(estado) as string;
    const com = montarPromptImagem(estado, { temReferencia: true }) as string;
    expect(sem).toContain('"tipo_especifico": "Esquadria veneziana"');
    expect(sem).not.toMatch(/referência de estilo/);
    expect(com).toMatch(/referência de estilo/);
  });
});

describe("limparDescricao", () => {
  it("remove vazios recursivamente", () => {
    expect(limparDescricao({ a: "", b: { c: undefined, d: "x" }, e: [], f: ["", "y"] })).toEqual({ b: { d: "x" }, f: ["y"] });
  });
});
