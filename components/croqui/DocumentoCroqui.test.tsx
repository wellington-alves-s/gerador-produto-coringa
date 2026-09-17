import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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

  it("mostra prazo de 90 dias para porta-acm", () => {
    const estado = { ...ESTADO_INICIAL, tipo: "porta-acm" as const };
    render(<DocumentoCroqui estado={estado} />);
    expect(screen.getByText(/ATÉ 90 DIAS/)).toBeInTheDocument();
  });

  it("Fornecedor e Custo aparecem em branco quando não preenchidos", () => {
    const estado = { ...ESTADO_INICIAL, tipo: "outros" as const };
    render(<DocumentoCroqui estado={estado} />);
    expect(screen.getByText(/Fornecedor: _+/)).toBeInTheDocument();
    expect(screen.getByText(/Custo: _+/)).toBeInTheDocument();
  });

  it("mostra Fornecedor e Custo quando preenchidos (versão para compras)", () => {
    const estado = {
      ...ESTADO_INICIAL,
      tipo: "outros" as const,
      compra: { fornecedor: "Marcenaria XYZ", custo: "R$ 450,00" },
    };
    render(<DocumentoCroqui estado={estado} />);
    expect(screen.getByText("Fornecedor: Marcenaria XYZ")).toBeInTheDocument();
    expect(screen.getByText("Custo: R$ 450,00")).toBeInTheDocument();
  });

  it("tipo Outros não mostra seção de especificações técnicas", () => {
    const estado = { ...ESTADO_INICIAL, tipo: "outros" as const };
    render(<DocumentoCroqui estado={estado} />);
    expect(screen.queryByText("Especificações técnicas")).toBeNull();
  });
});
