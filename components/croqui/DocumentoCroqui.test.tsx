import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { DocumentoCroqui } from "./DocumentoCroqui";
import { ESTADO_INICIAL } from "@/lib/pedido";

describe("DocumentoCroqui", () => {
  it("mostra o título e o prazo corretos para esquadria (60 dias)", () => {
    const estado = {
      ...ESTADO_INICIAL,
      tipo: "esquadria" as const,
      pedido: { ...ESTADO_INICIAL.pedido, descricao: "Janela de sala" },
      especificacoes: { altura: "2100", largura: "1200" },
    };
    render(<DocumentoCroqui estado={estado} />);

    expect(screen.getByText("ENCOMENDA ESPECIAL ESQUADRIAS")).toBeInTheDocument();
    expect(screen.getByText(/ATÉ 60 DIAS/)).toBeInTheDocument();
    expect(screen.getByText("Altura: 2,100 m")).toBeInTheDocument();
  });

  it("esquadria: campos com exibirApenasSelecionadas mostram só as opções marcadas, com ☑ e em negrito, sem listar as não marcadas", () => {
    const estado = {
      ...ESTADO_INICIAL,
      tipo: "esquadria" as const,
      especificacoes: { categoria: "QUADRICULADO|VENEZIANA" },
    };
    render(<DocumentoCroqui estado={estado} />);

    const marcadas = screen.getByText("☑ QUADRICULADO ☑ VENEZIANA");
    expect(marcadas).toHaveClass("font-bold");
    expect(screen.queryByText("PANORÂMICO")).toBeNull();

    const secaoEspecificacoes = screen.getByText("Especificações técnicas").parentElement as HTMLElement;
    expect(within(secaoEspecificacoes).queryByText(/☐/)).toBeNull();
  });

  it("esquadria: campo com exibirApenasSelecionadas mostra travessão quando nada foi marcado", () => {
    const estado = { ...ESTADO_INICIAL, tipo: "esquadria" as const };
    render(<DocumentoCroqui estado={estado} />);

    expect(screen.getByText("Categoria: —")).toBeInTheDocument();
  });

  it("mostra prazo de 90 dias para porta-acm", () => {
    const estado = { ...ESTADO_INICIAL, tipo: "porta-acm" as const };
    render(<DocumentoCroqui estado={estado} />);
    expect(screen.getByText(/ATÉ 90 DIAS/)).toBeInTheDocument();
  });

  it("Fornecedor e Custo aparecem em branco quando não preenchidos", () => {
    const estado = { ...ESTADO_INICIAL, tipo: "outros" as const };
    render(<DocumentoCroqui estado={estado} />);
    expect(screen.getByText(/Fornecedor: _+/)).toBeInTheDocument();
    expect(screen.getByText(/Cotação Custo: _+/)).toBeInTheDocument();
  });

  it("mostra Fornecedor e Custo quando preenchidos (versão para compras)", () => {
    const estado = {
      ...ESTADO_INICIAL,
      tipo: "outros" as const,
      compra: { fornecedor: "Marcenaria XYZ", custo: "R$ 450,00", tabelaMadel: false },
    };
    render(<DocumentoCroqui estado={estado} />);
    expect(screen.getByText("Fornecedor: Marcenaria XYZ")).toBeInTheDocument();
    expect(screen.getByText("Cotação Custo: R$ 450,00")).toBeInTheDocument();
  });

  it("marca o checkbox Tabela Madel quando selecionado", () => {
    const estado = {
      ...ESTADO_INICIAL,
      tipo: "outros" as const,
      compra: { fornecedor: "", custo: "", tabelaMadel: true },
    };
    render(<DocumentoCroqui estado={estado} />);
    expect(screen.getByText("☑ Tabela Madel")).toBeInTheDocument();
  });

  it("tipo Outros mostra Detalhes/Altura/Largura na seção de especificações, mas a régua só aparece se for preenchido", () => {
    const estado = { ...ESTADO_INICIAL, tipo: "outros" as const };
    render(<DocumentoCroqui estado={estado} />);
    expect(screen.getByText("Especificações técnicas")).toBeInTheDocument();
    expect(screen.getByText(/^Detalhes:/)).toBeInTheDocument();
    expect(screen.queryByText(/ Altura$/)).toBeNull();
    expect(screen.queryByText(/ Largura$/)).toBeNull();
  });

  it("tipo Outros mostra a régua de altura/largura no desenho quando preenchidas", () => {
    const estado = {
      ...ESTADO_INICIAL,
      tipo: "outros" as const,
      especificacoes: { altura: "2100", largura: "900" },
    };
    render(<DocumentoCroqui estado={estado} />);
    expect(screen.getByText("2,100 m Altura")).toBeInTheDocument();
    expect(screen.getByText("0,900 m Largura")).toBeInTheDocument();
  });

  it("campos de opção mostram todas as alternativas como checkbox, com a escolhida marcada", () => {
    const estado = {
      ...ESTADO_INICIAL,
      tipo: "porta-marcenaria" as const,
      especificacoes: { friso: "2 LADOS", tipoFolha: "FRISADA|RASGADA" },
    };
    render(<DocumentoCroqui estado={estado} />);

    expect(screen.getAllByText("☑ 2 LADOS").length).toBeGreaterThan(0);
    expect(screen.getAllByText("☐ 1 LADO").length).toBeGreaterThan(0);
    expect(screen.getByText("☑ FRISADA")).toBeInTheDocument();
    expect(screen.getByText("☑ RASGADA")).toBeInTheDocument();
  });

  it("campos de opção mostram a label da categoria antes das alternativas, com Cava aparecendo só uma vez", () => {
    const estado = {
      ...ESTADO_INICIAL,
      tipo: "porta-marcenaria" as const,
      especificacoes: { cava: "FOLEADA", cavaLados: "1 LADO" },
    };
    render(<DocumentoCroqui estado={estado} />);

    expect(screen.getAllByText("Cava:")).toHaveLength(1);
    expect(screen.getByText("Tipo:")).toBeInTheDocument();
    expect(screen.getByText("Friso:")).toBeInTheDocument();
  });

  it("medida com 2 casas inteiras não mostra zero à esquerda quando o valor é menor que 10", () => {
    const estado = {
      ...ESTADO_INICIAL,
      tipo: "porta-acm" as const,
      especificacoes: { medidasGuarnicao: "050", tipoFolha: "CONJUNTO" },
    };
    render(<DocumentoCroqui estado={estado} />);

    expect(screen.getByText(/Medidas de guarnição: 5,0 cm/)).toBeInTheDocument();
  });

  it("campos com o mesmo número de linha ficam agrupados na mesma linha do documento", () => {
    const estado = {
      ...ESTADO_INICIAL,
      tipo: "porta-marcenaria" as const,
      especificacoes: { modeloFriso: "F.12D" },
    };
    render(<DocumentoCroqui estado={estado} />);

    const modelo = screen.getByText(/Modelo de friso: F\.12D/);
    const profundidade = screen.getByText(/Profundidade do friso:/);
    expect(modelo.parentElement).toBe(profundidade.parentElement);
  });

  it("mostra as réguas de largura e altura do desenho quando os campos correspondentes estão preenchidos", () => {
    const estado = {
      ...ESTADO_INICIAL,
      tipo: "esquadria" as const,
      especificacoes: { altura: "2100", largura: "1200" },
    };
    render(<DocumentoCroqui estado={estado} />);

    expect(screen.getByText("2,100 m Altura")).toBeInTheDocument();
    expect(screen.getByText("1,200 m Largura")).toBeInTheDocument();
  });

  it("não mostra régua quando o campo de dimensão correspondente está vazio", () => {
    const estado = { ...ESTADO_INICIAL, tipo: "esquadria" as const };
    render(<DocumentoCroqui estado={estado} />);

    expect(screen.queryByText(/Altura$/)).toBeNull();
    expect(screen.queryByText(/Largura$/)).toBeNull();
  });

  it("degrau-patamar-rodape: régua horizontal mostra Comprimento e a vertical mostra Largura (orientação física da peça)", () => {
    const estado = {
      ...ESTADO_INICIAL,
      tipo: "degrau-patamar-rodape" as const,
      especificacoes: { largura: "0300", comprimento: "1400" },
    };
    render(<DocumentoCroqui estado={estado} />);

    expect(screen.getByText("1,400 m Comprimento")).toBeInTheDocument();
    expect(screen.getByText("0,300 m Largura")).toBeInTheDocument();
    expect(screen.queryByText(/ Altura$/)).toBeNull();
  });

  it("mostra a informação adicional abaixo da imagem quando preenchida", () => {
    const estado = {
      ...ESTADO_INICIAL,
      tipo: "outros" as const,
      pedido: { ...ESTADO_INICIAL.pedido, notaAdicional: "Vidro fumê" },
    };
    render(<DocumentoCroqui estado={estado} />);
    expect(screen.getByText("Vidro fumê")).toBeInTheDocument();
  });

  it("não mostra nada quando a informação adicional está vazia", () => {
    const estado = { ...ESTADO_INICIAL, tipo: "outros" as const };
    const { container } = render(<DocumentoCroqui estado={estado} />);
    expect(container.querySelector("p.border-gray-300")).toBeNull();
  });

  it("mostra o logo e o selo da Madel no rodapé", () => {
    const estado = { ...ESTADO_INICIAL, tipo: "outros" as const };
    render(<DocumentoCroqui estado={estado} />);

    expect(screen.getByAltText("Madel")).toHaveAttribute("src", "/marca/logo-madel.png");
    expect(screen.getByAltText(/Selo de qualidade/)).toHaveAttribute("src", "/marca/selo-qualidade.png");
  });
});
