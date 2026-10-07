import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, type ReactNode } from "react";
import { WizardProvider, useWizard } from "@/lib/wizard-context";
import type { TipoProdutoId } from "@/produtos/tipos";
import EtapaImagem from "./page";

const push = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }) }));

vi.mock("@/lib/biblioteca-dados", () => ({
  BIBLIOTECA: [
    { id: "porta-arco", nome: "Porta Balcão Arco", categoria: "porta", arquivo: "porta-arco.jpg" },
    { id: "painel-solido", nome: "Painel Sólido", categoria: "painel", arquivo: "painel-solido.jpg" },
  ],
}));

const solicitarImagemGeradaMock = vi.fn();
vi.mock("@/lib/gerar-imagem-cliente", async (importarOriginal) => ({
  ...(await importarOriginal<typeof import("@/lib/gerar-imagem-cliente")>()),
  solicitarImagemGerada: (...args: unknown[]) => solicitarImagemGeradaMock(...args),
}));

function ComTipo({ children, tipo = "outros" }: { children: ReactNode; tipo?: TipoProdutoId }) {
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
  solicitarImagemGeradaMock.mockReset();
});

describe("Etapa Imagem", () => {
  it("filtra a biblioteca ao digitar na busca", async () => {
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <ComTipo>
          <EtapaImagem />
        </ComTipo>
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
        <ComTipo>
          <EtapaImagem />
        </ComTipo>
      </WizardProvider>
    );

    await user.click(screen.getByAltText("Porta Balcão Arco"));
    expect(screen.getByAltText("Imagem selecionada")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remover imagem" }));
    expect(screen.queryByAltText("Imagem selecionada")).toBeNull();
  });

  it("clicar no botão de olho abre a imagem da biblioteca em tamanho maior numa nova aba", async () => {
    const user = userEvent.setup();
    const abrirJanela = vi.fn();
    vi.stubGlobal("open", abrirJanela);

    render(
      <WizardProvider>
        <ComTipo>
          <EtapaImagem />
        </ComTipo>
      </WizardProvider>
    );

    await user.click(screen.getByRole("button", { name: "Ver Porta Balcão Arco em tamanho maior" }));

    expect(abrirJanela).toHaveBeenCalledWith(
      "/biblioteca/produtos/porta-arco.jpg",
      "_blank",
      "noopener,noreferrer"
    );
    expect(screen.queryByAltText("Imagem selecionada")).toBeNull();

    vi.unstubAllGlobals();
  });

  it("Próximo avança para a Revisão mesmo sem imagem escolhida", async () => {
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <ComTipo>
          <EtapaImagem />
        </ComTipo>
      </WizardProvider>
    );
    await user.click(screen.getByRole("button", { name: /Próximo/ }));
    expect(push).toHaveBeenCalledWith("/criar/revisao");
  });

  it("redireciona para /criar/tipo quando não há tipo definido", () => {
    render(
      <WizardProvider>
        <EtapaImagem />
      </WizardProvider>
    );
    expect(replace).toHaveBeenCalledWith("/criar/tipo");
  });

  it("não mostra o botão Gerar imagem para o tipo Outros", () => {
    render(
      <WizardProvider>
        <ComTipo tipo="outros">
          <EtapaImagem />
        </ComTipo>
      </WizardProvider>
    );
    expect(screen.queryByRole("button", { name: "Gerar imagem" })).toBeNull();
  });

  it("Gerar imagem abre o modal com o resultado e permite descartar", async () => {
    solicitarImagemGeradaMock.mockResolvedValue("data:image/png;base64,QUJD");
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <ComTipo tipo="esquadria">
          <EtapaImagem />
        </ComTipo>
      </WizardProvider>
    );

    await user.click(screen.getByRole("button", { name: "Gerar imagem" }));

    expect(await screen.findByAltText("Imagem gerada por IA")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Usar esta imagem" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Descartar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("mostra a mensagem de erro no modal e permite tentar de novo", async () => {
    solicitarImagemGeradaMock.mockRejectedValueOnce(new Error("Geração de imagem não configurada neste ambiente."));
    solicitarImagemGeradaMock.mockResolvedValueOnce("data:image/png;base64,QUJD");
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <ComTipo tipo="porta-acm">
          <EtapaImagem />
        </ComTipo>
      </WizardProvider>
    );

    await user.click(screen.getByRole("button", { name: "Gerar imagem" }));
    expect(await screen.findByText(/não configurada/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByAltText("Imagem gerada por IA")).toBeInTheDocument();
  });
});
