import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, type ReactNode } from "react";
import { WizardProvider, useWizard } from "@/lib/wizard-context";
import EtapaRevisao from "./page";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function ComTipo({ children }: { children: ReactNode }) {
  const { dispatch } = useWizard();
  useEffect(() => {
    dispatch({ type: "DEFINIR_TIPO", tipo: "outros" });
  }, [dispatch]);
  return <>{children}</>;
}

beforeEach(() => {
  window.localStorage.clear();
  push.mockClear();
});

describe("Etapa Revisão", () => {
  it("mostra o preview do documento e permite preencher Fornecedor/Custo", async () => {
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <ComTipo>
          <EtapaRevisao />
        </ComTipo>
      </WizardProvider>
    );

    expect(screen.getByTestId("documento-croqui")).toBeInTheDocument();
    expect(screen.getByText(/Fornecedor: _+/)).toBeInTheDocument();

    await user.click(screen.getByText(/Informações de compra/));
    await user.type(screen.getByLabelText("Fornecedor"), "Marcenaria XYZ");

    expect(screen.getByText("Fornecedor: Marcenaria XYZ")).toBeInTheDocument();
  });

  it("Gerar Croqui avança para a tela de Resultado", async () => {
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <ComTipo>
          <EtapaRevisao />
        </ComTipo>
      </WizardProvider>
    );
    await user.click(screen.getByRole("button", { name: "Gerar Croqui" }));
    expect(push).toHaveBeenCalledWith("/criar/resultado");
  });
});
