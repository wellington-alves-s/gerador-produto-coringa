import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WizardProvider } from "@/lib/wizard-context";
import { ESTADO_INICIAL } from "@/lib/pedido";
import { carregarRascunho, salvarRascunho } from "@/lib/wizard-storage";
import EtapaTipo from "./page";

const push = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => "/criar/tipo",
}));

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.history.pushState({}, "", "/criar/tipo");
  push.mockClear();
  replace.mockClear();
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

describe("Etapa Tipo — croqui novo x voltar", () => {
  const rascunhoDeUmPedido = () =>
    salvarRascunho({ ...ESTADO_INICIAL, tipo: "esquadria", pedido: { ...ESTADO_INICIAL.pedido, cliente: "Maria" }, croquiId: 7 });

  it("chegando por ?novo=1 (logo/casinha) começa um croqui novo: descarta o em andamento e limpa a URL", async () => {
    rascunhoDeUmPedido();
    window.history.pushState({}, "", "/criar/tipo?novo=1");
    render(
      <WizardProvider>
        <EtapaTipo />
      </WizardProvider>
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/criar/tipo"));
    expect(screen.getByRole("button", { name: /Próximo/ })).toBeDisabled();
    await waitFor(() => expect(carregarRascunho()).toBeNull());
  });

  it("chegando pelo Voltar (sem ?novo) mantém o croqui em andamento e o tipo escolhido", () => {
    rascunhoDeUmPedido();
    render(
      <WizardProvider>
        <EtapaTipo />
      </WizardProvider>
    );
    expect(screen.getByRole("button", { name: /Próximo/ })).toBeEnabled();
    expect(replace).not.toHaveBeenCalled();
  });
});
