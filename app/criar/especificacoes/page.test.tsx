import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, type ReactNode } from "react";
import { WizardProvider, useWizard } from "@/lib/wizard-context";
import type { TipoProdutoId } from "@/produtos/tipos";
import EtapaEspecificacoes from "./page";

const push = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
}));

function ComTipo({ tipo, children }: { tipo: TipoProdutoId; children: ReactNode }) {
  const { dispatch } = useWizard();
  useEffect(() => {
    dispatch({ type: "DEFINIR_TIPO", tipo });
  }, [dispatch, tipo]);
  return <>{children}</>;
}

beforeEach(() => {
  window.localStorage.clear();
  push.mockClear();
  replace.mockClear();
});

describe("Etapa Especificações", () => {
  it("renderiza os campos do tipo escolhido e bloqueia o Próximo sem os obrigatórios", () => {
    render(
      <WizardProvider>
        <ComTipo tipo="esquadria">
          <EtapaEspecificacoes />
        </ComTipo>
      </WizardProvider>
    );

    expect(screen.getByText(/Especificações — Esquadrias Encomenda/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Próximo/ })).toBeDisabled();
  });

  it("libera o Próximo ao preencher altura e largura", async () => {
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <ComTipo tipo="esquadria">
          <EtapaEspecificacoes />
        </ComTipo>
      </WizardProvider>
    );

    await user.type(screen.getByLabelText(/^Altura/), "2100");
    await user.type(screen.getByLabelText(/^Largura/), "900");

    expect(screen.getByRole("button", { name: /Próximo/ })).toBeEnabled();
  });

  it("pula direto pra Etapa de Imagem quando o tipo é Outros", () => {
    render(
      <WizardProvider>
        <ComTipo tipo="outros">
          <EtapaEspecificacoes />
        </ComTipo>
      </WizardProvider>
    );

    expect(replace).toHaveBeenCalledWith("/criar/imagem");
  });
});
