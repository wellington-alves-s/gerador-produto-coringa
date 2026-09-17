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
});
