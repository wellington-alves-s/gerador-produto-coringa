import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ESTADO_INICIAL } from "@/lib/pedido";
import EtapaPedido from "./pedido/page";
import EtapaEspecificacoes from "./especificacoes/page";
import EtapaImagem from "./imagem/page";
import EtapaRevisao from "./revisao/page";
import EtapaResultado from "./resultado/page";
import EtapaTipo from "./tipo/page";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }), usePathname: () => "/criar/tipo" }));

const salvarAgora = vi.fn();
let estado = ESTADO_INICIAL;
vi.mock("@/lib/wizard-context", () => ({
  useWizard: () => ({
    estado,
    dispatch: vi.fn(),
    salvarAgora,
    statusSalvamento: "ocioso",
    mensagemSalvamento: null,
  }),
}));

beforeEach(() => {
  push.mockClear();
  salvarAgora.mockReset().mockResolvedValue(undefined);
  estado = {
    ...ESTADO_INICIAL,
    tipo: "outros",
    pedido: { ...ESTADO_INICIAL.pedido, cliente: "Maria", descricao: "Porta" },
  };
});

describe("salvamento automático nos botões Próximo", () => {
  it("Pedido: salva e navega", async () => {
    render(<EtapaPedido />);
    await userEvent.click(screen.getByRole("button", { name: /Próximo/ }));
    expect(salvarAgora).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/criar/especificacoes");
  });

  it("Especificações: salva e navega", async () => {
    render(<EtapaEspecificacoes />);
    await userEvent.click(screen.getByRole("button", { name: /Próximo/ }));
    expect(salvarAgora).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/criar/imagem");
  });

  it("Imagem: salva e navega", async () => {
    render(<EtapaImagem />);
    await userEvent.click(screen.getByRole("button", { name: /Próximo/ }));
    expect(salvarAgora).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/criar/revisao");
  });

  it("Revisão: 'Gerar Croqui' salva e navega", async () => {
    render(<EtapaRevisao />);
    await userEvent.click(screen.getByRole("button", { name: /Gerar Croqui/ }));
    expect(salvarAgora).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/criar/resultado");
  });

  it("navega mesmo que o salvamento demore (não espera a resposta)", async () => {
    salvarAgora.mockReturnValue(new Promise(() => {}));
    render(<EtapaPedido />);
    await userEvent.click(screen.getByRole("button", { name: /Próximo/ }));
    expect(push).toHaveBeenCalledWith("/criar/especificacoes");
  });

  it("Tipo (primeira etapa) não salva", async () => {
    render(<EtapaTipo />);
    expect(salvarAgora).not.toHaveBeenCalled();
  });
});

describe("Resultado: botão Salvar", () => {
  it("chama salvarAgora", async () => {
    render(<EtapaResultado />);
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(salvarAgora).toHaveBeenCalledTimes(1);
  });

  it("fica desabilitado enquanto o cliente não foi informado", () => {
    estado = { ...estado, pedido: { ...estado.pedido, cliente: "" } };
    render(<EtapaResultado />);
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });
});
