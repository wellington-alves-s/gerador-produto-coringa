import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WizardProvider } from "@/lib/wizard-context";
import EtapaImagem from "./page";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

vi.mock("@/lib/biblioteca-dados", () => ({
  BIBLIOTECA: [
    { id: "porta-arco", nome: "Porta Balcão Arco", categoria: "porta", arquivo: "porta-arco.jpg" },
    { id: "painel-solido", nome: "Painel Sólido", categoria: "painel", arquivo: "painel-solido.jpg" },
  ],
}));

beforeEach(() => {
  window.localStorage.clear();
  push.mockClear();
});

describe("Etapa Imagem", () => {
  it("filtra a biblioteca ao digitar na busca", async () => {
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <EtapaImagem />
      </WizardProvider>
    );

    expect(screen.getByAltText("Porta Balcão Arco")).toBeInTheDocument();
    expect(screen.getByAltText("Painel Sólido")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/Buscar por nome/), "painel");

    expect(screen.queryByAltText("Porta Balcão Arco")).toBeNull();
    expect(screen.getByAltText("Painel Sólido")).toBeInTheDocument();
  });

  it("escolher uma imagem da biblioteca mostra o preview e permite remover", async () => {
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <EtapaImagem />
      </WizardProvider>
    );

    await user.click(screen.getByAltText("Porta Balcão Arco"));
    expect(screen.getByAltText("Imagem selecionada")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remover imagem" }));
    expect(screen.queryByAltText("Imagem selecionada")).toBeNull();
  });

  it("Próximo avança para a Revisão mesmo sem imagem escolhida", async () => {
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <EtapaImagem />
      </WizardProvider>
    );
    await user.click(screen.getByRole("button", { name: /Próximo/ }));
    expect(push).toHaveBeenCalledWith("/criar/revisao");
  });
});
