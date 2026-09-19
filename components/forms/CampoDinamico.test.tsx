import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CampoDinamico } from "./CampoDinamico";
import type { Campo } from "@/produtos/tipos";

describe("CampoDinamico", () => {
  it("campo de texto chama aoAlterar com o valor digitado", async () => {
    const aoAlterar = vi.fn();
    const campo: Campo = { id: "modeloFriso", tipo: "texto", label: "Modelo de friso" };
    render(<CampoDinamico campo={campo} valor="" aoAlterar={aoAlterar} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Modelo de friso"), "X");
    expect(aoAlterar).toHaveBeenCalledWith("X");
  });

  it("campo de medida formata e atualiza o buffer ao digitar", async () => {
    const aoAlterar = vi.fn();
    const campo: Campo = { id: "altura", tipo: "medida", unidade: "m", label: "Altura" };
    render(<CampoDinamico campo={campo} valor="" aoAlterar={aoAlterar} />);

    expect(screen.getByRole("textbox")).toHaveValue("0,000");
    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox"), "9");
    expect(aoAlterar).toHaveBeenCalledWith("0009");
  });

  it("campo de opção única marca a opção clicada", async () => {
    const aoAlterar = vi.fn();
    const campo: Campo = { id: "friso", tipo: "opcao-unica", label: "Friso", opcoes: ["1 LADO", "2 LADOS"] };
    render(<CampoDinamico campo={campo} valor="" aoAlterar={aoAlterar} />);

    const user = userEvent.setup();
    await user.click(screen.getByLabelText("2 LADOS"));
    expect(aoAlterar).toHaveBeenCalledWith("2 LADOS");
  });

  it("campo de opção única desmarca ao clicar de novo na opção já selecionada", async () => {
    const aoAlterar = vi.fn();
    const campo: Campo = { id: "friso", tipo: "opcao-unica", label: "Friso", opcoes: ["1 LADO", "2 LADOS"] };
    render(<CampoDinamico campo={campo} valor="2 LADOS" aoAlterar={aoAlterar} />);

    const user = userEvent.setup();
    await user.click(screen.getByLabelText("2 LADOS"));
    expect(aoAlterar).toHaveBeenCalledWith("");
  });

  it("campo de múltipla escolha acumula seleções separadas por |", async () => {
    const aoAlterar = vi.fn();
    const campo: Campo = { id: "tipoFolha", tipo: "multipla-escolha", label: "Tipo", opcoes: ["FRISADA", "RASGADA"] };
    const { rerender } = render(<CampoDinamico campo={campo} valor="" aoAlterar={aoAlterar} />);

    const user = userEvent.setup();
    await user.click(screen.getByLabelText("FRISADA"));
    expect(aoAlterar).toHaveBeenCalledWith("FRISADA");

    rerender(<CampoDinamico campo={campo} valor="FRISADA" aoAlterar={aoAlterar} />);
    await user.click(screen.getByLabelText("RASGADA"));
    expect(aoAlterar).toHaveBeenCalledWith("FRISADA|RASGADA");
  });

  it("campo de múltipla escolha desmarca outras opções do mesmo grupo excludente ao marcar uma nova", async () => {
    const aoAlterar = vi.fn();
    const campo: Campo = {
      id: "categoria",
      tipo: "multipla-escolha",
      label: "Categoria",
      opcoes: ["PANORÂMICO", "SEMI-PANORÂMICO", "QUADRICULADO", "VENEZIANA"],
      gruposExcludentes: [["PANORÂMICO", "SEMI-PANORÂMICO", "QUADRICULADO"]],
    };
    render(<CampoDinamico campo={campo} valor="PANORÂMICO|VENEZIANA" aoAlterar={aoAlterar} />);

    const user = userEvent.setup();
    await user.click(screen.getByLabelText("QUADRICULADO"));
    expect(aoAlterar).toHaveBeenCalledWith("VENEZIANA|QUADRICULADO");
  });

  it("aplica destaque de erro (anel vermelho piscando) quando erro=true", () => {
    const campo: Campo = { id: "friso", tipo: "opcao-unica", label: "Friso", opcoes: ["1 LADO", "2 LADOS"] };
    render(<CampoDinamico campo={campo} valor="" aoAlterar={vi.fn()} erro />);

    expect(screen.getByText("Friso").closest("fieldset")).toHaveClass("ring-red-600", "animate-pulse");
  });

  it("não aplica destaque de erro quando erro=false ou ausente", () => {
    const campo: Campo = { id: "friso", tipo: "opcao-unica", label: "Friso", opcoes: ["1 LADO", "2 LADOS"] };
    render(<CampoDinamico campo={campo} valor="" aoAlterar={vi.fn()} />);

    expect(screen.getByText("Friso").closest("fieldset")).not.toHaveClass("ring-red-600");
  });
});
