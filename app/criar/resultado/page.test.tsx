import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, type ReactNode } from "react";
import { WizardProvider, useWizard } from "@/lib/wizard-context";
import EtapaResultado from "./page";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const exportarComoPdfMock = vi.fn().mockResolvedValue(undefined);
const exportarComoImagemMock = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/exportar-pdf", () => ({ exportarComoPdf: (...args: unknown[]) => exportarComoPdfMock(...args) }));
vi.mock("@/lib/exportar-imagem", () => ({
  exportarComoImagem: (...args: unknown[]) => exportarComoImagemMock(...args),
}));

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
  exportarComoPdfMock.mockClear();
  exportarComoImagemMock.mockClear();
});

describe("Etapa Resultado", () => {
  it("Baixar PDF chama exportarComoPdf com o nome do arquivo esperado", async () => {
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <ComTipo>
          <EtapaResultado />
        </ComTipo>
      </WizardProvider>
    );

    await user.click(screen.getByRole("button", { name: "Baixar PDF" }));

    await waitFor(() => expect(exportarComoPdfMock).toHaveBeenCalledTimes(1));
    expect(exportarComoPdfMock.mock.calls[0][1]).toBe("encomenda-especial-outros.pdf");
  });

  it("Baixar Imagem chama exportarComoImagem com o nome do arquivo esperado", async () => {
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <ComTipo>
          <EtapaResultado />
        </ComTipo>
      </WizardProvider>
    );

    await user.click(screen.getByRole("button", { name: "Baixar Imagem" }));

    await waitFor(() => expect(exportarComoImagemMock).toHaveBeenCalledTimes(1));
    expect(exportarComoImagemMock.mock.calls[0][1]).toBe("encomenda-especial-outros.png");
  });

  it("mostra mensagem de erro quando a exportação falha", async () => {
    exportarComoPdfMock.mockRejectedValueOnce(new Error("falhou"));
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <ComTipo>
          <EtapaResultado />
        </ComTipo>
      </WizardProvider>
    );

    await user.click(screen.getByRole("button", { name: "Baixar PDF" }));

    expect(await screen.findByText(/Não foi possível gerar o PDF/)).toBeInTheDocument();
  });

  it("mostra o croqui consolidado, sem as ferramentas de edição", () => {
    render(
      <WizardProvider>
        <ComTipo>
          <EtapaResultado />
        </ComTipo>
      </WizardProvider>
    );
    expect(screen.getByTestId("documento-croqui")).toBeInTheDocument();
    expect(screen.queryByRole("toolbar")).toBeNull();
    expect(screen.queryByTestId("camada-edicao")).toBeNull();
  });
});
