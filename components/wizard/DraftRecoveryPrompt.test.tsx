import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WizardProvider } from "@/lib/wizard-context";
import { DraftRecoveryPrompt } from "./DraftRecoveryPrompt";
import { salvarRascunho } from "@/lib/wizard-storage";
import { ESTADO_INICIAL } from "@/lib/pedido";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

beforeEach(() => {
  window.localStorage.clear();
  push.mockClear();
});

describe("DraftRecoveryPrompt", () => {
  it("não mostra nada quando não há rascunho salvo", () => {
    render(
      <WizardProvider>
        <DraftRecoveryPrompt />
      </WizardProvider>
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("mostra o aviso e carrega o rascunho ao clicar em Continuar", async () => {
    salvarRascunho({ ...ESTADO_INICIAL, tipo: "esquadria", ultimaEtapa: "especificacoes" });
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <DraftRecoveryPrompt />
      </WizardProvider>
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(push).toHaveBeenCalledWith("/criar/especificacoes");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("descarta o rascunho ao clicar em Começar nova", async () => {
    salvarRascunho({ ...ESTADO_INICIAL, tipo: "outros", ultimaEtapa: "pedido" });
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <DraftRecoveryPrompt />
      </WizardProvider>
    );

    await user.click(screen.getByRole("button", { name: "Começar nova" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
