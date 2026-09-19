import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
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
  it("renderiza os campos do tipo escolhido e mantém o usuário na página ao clicar Próximo sem os obrigatórios", async () => {
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <ComTipo tipo="esquadria">
          <EtapaEspecificacoes />
        </ComTipo>
      </WizardProvider>
    );

    expect(screen.getByText(/Especificações — Esquadrias Encomenda/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Próximo/ })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: /Próximo/ }));

    expect(push).not.toHaveBeenCalledWith("/criar/imagem");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("avança ao preencher todos os campos obrigatórios da esquadria", async () => {
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
    await user.type(screen.getByLabelText(/^Caixa/), "140");
    await user.type(screen.getByLabelText(/^Padrão de madeira/), "Cedro");
    await user.type(screen.getByLabelText(/^Medidas de guarnição/), "50");
    await user.click(screen.getByLabelText("FRANCESA"));
    await user.click(screen.getByLabelText("COM FERRAGENS"));
    await user.click(screen.getByLabelText("CROMADO"));
    await user.click(screen.getByLabelText("GIRO"));
    await user.click(screen.getByLabelText("ESQUERDA"));
    await user.click(screen.getByRole("button", { name: /Próximo/ }));

    expect(push).toHaveBeenCalledWith("/criar/imagem");
  });

  it("esquadria: exige acabamento da ferragem quando Ferragem é COM FERRAGENS, mas não quando é SEM FERRAGENS", async () => {
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
    await user.type(screen.getByLabelText(/^Caixa/), "140");
    await user.type(screen.getByLabelText(/^Padrão de madeira/), "Cedro");
    await user.type(screen.getByLabelText(/^Medidas de guarnição/), "50");
    await user.click(screen.getByLabelText("FRANCESA"));
    await user.click(screen.getByLabelText("SEM FERRAGENS"));
    await user.click(screen.getByLabelText("GIRO"));
    await user.click(screen.getByLabelText("ESQUERDA"));
    await user.click(screen.getByRole("button", { name: /Próximo/ }));

    expect(push).toHaveBeenCalledWith("/criar/imagem");
  });

  it("mostra Detalhes, Altura e Largura pra Outros, e avança mesmo sem preenchê-los (nenhum é obrigatório)", async () => {
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <ComTipo tipo="outros">
          <EtapaEspecificacoes />
        </ComTipo>
      </WizardProvider>
    );

    expect(replace).not.toHaveBeenCalledWith("/criar/imagem");
    expect(screen.getByLabelText("Detalhes")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Altura/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Largura/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Próximo/ }));

    expect(push).toHaveBeenCalledWith("/criar/imagem");
  });

  async function preencherObrigatoriosComunsPortaMarcenaria(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/^Altura da folha/), "2100");
    await user.type(screen.getByLabelText(/^Largura da folha/), "900");
    await user.click(screen.getByLabelText("35MM"));
    await user.click(screen.getByLabelText("IMBUIA"));
  }

  it("exige Friso quando Tipo é FRISADA na Porta Marcenaria, com modal e destaque no campo", async () => {
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <ComTipo tipo="porta-marcenaria">
          <EtapaEspecificacoes />
        </ComTipo>
      </WizardProvider>
    );

    await user.click(screen.getByLabelText("FRISADA"));
    await preencherObrigatoriosComunsPortaMarcenaria(user);
    await user.click(screen.getByRole("button", { name: /Próximo/ }));

    expect(push).not.toHaveBeenCalledWith("/criar/imagem");
    expect(screen.getByRole("dialog")).toHaveTextContent("Friso");

    await user.click(screen.getByRole("button", { name: "Entendi" }));
    const grupoFriso = screen.getByText("Friso").closest("fieldset") as HTMLElement;
    await user.click(within(grupoFriso).getByLabelText("2 LADOS"));
    await user.click(screen.getByRole("button", { name: /Próximo/ }));

    expect(push).toHaveBeenCalledWith("/criar/imagem");
  });

  it("não exige Friso quando Tipo não é FRISADA", async () => {
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <ComTipo tipo="porta-marcenaria">
          <EtapaEspecificacoes />
        </ComTipo>
      </WizardProvider>
    );

    await user.click(screen.getByLabelText("RASGADA"));
    await preencherObrigatoriosComunsPortaMarcenaria(user);
    await user.click(screen.getByRole("button", { name: /Próximo/ }));

    expect(push).toHaveBeenCalledWith("/criar/imagem");
  });

  it("exige Cava 1 LADO/2 LADOS quando Cava é FOLEADA ou SEM FOLEAR", async () => {
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <ComTipo tipo="porta-marcenaria">
          <EtapaEspecificacoes />
        </ComTipo>
      </WizardProvider>
    );

    const grupoCava = screen.getAllByText("Cava")[0].closest("fieldset") as HTMLElement;
    await user.click(within(grupoCava).getByLabelText("FOLEADA"));
    await preencherObrigatoriosComunsPortaMarcenaria(user);
    await user.click(screen.getByRole("button", { name: /Próximo/ }));

    expect(push).not.toHaveBeenCalledWith("/criar/imagem");
    expect(screen.getByRole("dialog")).toHaveTextContent("Cava");

    await user.click(screen.getByRole("button", { name: "Entendi" }));
    const grupoCavaLados = screen.getAllByText("Cava")[1].closest("fieldset") as HTMLElement;
    await user.click(within(grupoCavaLados).getByLabelText("1 LADO"));
    await user.click(screen.getByRole("button", { name: /Próximo/ }));

    expect(push).toHaveBeenCalledWith("/criar/imagem");
  });

  it("Espessura da folha e Padrão de madeira são sempre obrigatórios", async () => {
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <ComTipo tipo="porta-marcenaria">
          <EtapaEspecificacoes />
        </ComTipo>
      </WizardProvider>
    );

    await user.type(screen.getByLabelText(/^Altura da folha/), "2100");
    await user.type(screen.getByLabelText(/^Largura da folha/), "900");
    await user.click(screen.getByRole("button", { name: /Próximo/ }));

    expect(push).not.toHaveBeenCalledWith("/criar/imagem");
    expect(screen.getByRole("dialog")).toHaveTextContent("Espessura da folha");
    expect(screen.getByRole("dialog")).toHaveTextContent("Padrão de madeira");
  });
});
