import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WizardProvider } from "@/lib/wizard-context";
import EtapaPedido from "./page";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

beforeEach(() => {
  window.localStorage.clear();
  push.mockClear();
});

describe("Etapa Pedido", () => {
  it("bloqueia o Próximo sem descrição preenchida", () => {
    render(
      <WizardProvider>
        <EtapaPedido />
      </WizardProvider>
    );
    expect(screen.getByRole("button", { name: /Próximo/ })).toBeDisabled();
  });

  it("libera o Próximo ao preencher a descrição e avança para Especificações", async () => {
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <EtapaPedido />
      </WizardProvider>
    );

    await user.type(screen.getByLabelText(/Descrição do produto/), "Porta 2 folhas");
    const botaoProximo = screen.getByRole("button", { name: /Próximo/ });
    expect(botaoProximo).toBeEnabled();

    await user.click(botaoProximo);
    expect(push).toHaveBeenCalledWith("/criar/especificacoes");
  });

  it("Voltar retorna para a Etapa de Tipo", async () => {
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <EtapaPedido />
      </WizardProvider>
    );
    await user.click(screen.getByRole("button", { name: /Voltar/ }));
    expect(push).toHaveBeenCalledWith("/criar/tipo");
  });
});
