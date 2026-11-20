import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarcaInicio } from "./MarcaInicio";

describe("MarcaInicio", () => {
  it("a logo da Madel leva à tela de escolha do tipo, começando um croqui novo", () => {
    render(<MarcaInicio />);
    expect(screen.getByRole("link", { name: /Madel/ })).toHaveAttribute("href", "/criar/tipo?novo=1");
  });

  it("o ícone de casinha ao lado da logo tem a mesma função", () => {
    render(<MarcaInicio />);
    expect(screen.getByRole("link", { name: "Início" })).toHaveAttribute("href", "/criar/tipo?novo=1");
  });

  it("mantém o nome do sistema no cabeçalho", () => {
    render(<MarcaInicio />);
    expect(screen.getByText("Produto Coringa")).toBeInTheDocument();
  });
});
