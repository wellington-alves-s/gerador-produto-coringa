import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WizardProvider } from "@/lib/wizard-context";
import EtapaTipo from "./page";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

beforeEach(() => {
  window.localStorage.clear();
  push.mockClear();
});

describe("Etapa Tipo", () => {
  it("bloqueia o Próximo até escolher um tipo", () => {
    render(
      <WizardProvider>
        <EtapaTipo />
      </WizardProvider>
    );
    expect(screen.getByRole("button", { name: /Próximo/ })).toBeDisabled();
  });

  it("escolhe um tipo e avança para a Etapa de Pedido", async () => {
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <EtapaTipo />
      </WizardProvider>
    );

    await user.click(screen.getByRole("button", { name: "Esquadrias Encomenda" }));
    const botaoProximo = screen.getByRole("button", { name: /Próximo/ });
    expect(botaoProximo).toBeEnabled();

    await user.click(botaoProximo);
    expect(push).toHaveBeenCalledWith("/criar/pedido");
  });
});
