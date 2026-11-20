import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ESTADO_INICIAL } from "@/lib/pedido";
import { ContinuarCroqui } from "./ContinuarCroqui";

let estado = ESTADO_INICIAL;
vi.mock("@/lib/wizard-context", () => ({ useWizard: () => ({ estado }) }));

let usuario: { id: number; usuario: string; nome: string; admin: boolean } | null = { id: 5, usuario: "ana", nome: "Ana", admin: false };
vi.mock("@/lib/usuario-cliente", () => ({ useUsuario: () => ({ usuario, carregando: false }) }));

const abrir = vi.fn();
vi.mock("@/lib/abrir-croqui", () => ({ useAbrirCroqui: () => ({ abrir }) }));

const fetchMock = vi.fn();
const ultimo = { id: 31, cliente: "VITOR ALBERTO DE TRENTIN - 12523", numeroPedido: "50360234", tipo: "esquadria", atualizadoEm: "2026-11-20T12:00:00.000Z", vendedor: { id: 5, nome: "Ana" } };
const lista = (itens: unknown[]) => ({ ok: true, status: 200, json: async () => ({ itens, total: itens.length }) });

beforeEach(() => {
  estado = ESTADO_INICIAL;
  usuario = { id: 5, usuario: "ana", nome: "Ana", admin: false };
  abrir.mockReset().mockResolvedValue(true);
  fetchMock.mockReset().mockResolvedValue(lista([ultimo]));
  vi.stubGlobal("fetch", fetchMock);
});

describe("ContinuarCroqui", () => {
  it("pergunta se quer continuar e mostra, em letra menor, o último croqui salvo do próprio usuário", async () => {
    render(<ContinuarCroqui />);
    expect(await screen.findByText("Continuar?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sim" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ignorar" })).toBeInTheDocument();
    expect(screen.getByText("VITOR ALBERTO DE TRENTIN - 12523")).toBeInTheDocument();
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("/api/croquis?");
    expect(url).toContain("vendedor=5");
  });

  it("Sim reabre o último croqui de onde parou", async () => {
    render(<ContinuarCroqui />);
    await userEvent.click(await screen.findByRole("button", { name: "Sim" }));
    expect(abrir).toHaveBeenCalledWith(31, { retomar: true });
  });

  it("Ignorar fecha a caixa sem abrir nada", async () => {
    render(<ContinuarCroqui />);
    await userEvent.click(await screen.findByRole("button", { name: "Ignorar" }));
    expect(screen.queryByText("Continuar?")).toBeNull();
    expect(abrir).not.toHaveBeenCalled();
  });

  it("sem clicar em nada não faz nada (segue do zero)", async () => {
    render(<ContinuarCroqui />);
    await screen.findByText("Continuar?");
    expect(abrir).not.toHaveBeenCalled();
  });

  it("não aparece quando já há um croqui em andamento", async () => {
    estado = { ...ESTADO_INICIAL, tipo: "esquadria" };
    render(<ContinuarCroqui />);
    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled());
    expect(screen.queryByText("Continuar?")).toBeNull();
  });

  it("não aparece quando não há nenhum croqui salvo, nem quando a consulta falha", async () => {
    fetchMock.mockResolvedValue(lista([]));
    const { unmount } = render(<ContinuarCroqui />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByText("Continuar?")).toBeNull();
    unmount();

    fetchMock.mockRejectedValue(new Error("offline"));
    render(<ContinuarCroqui />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("Continuar?")).toBeNull();
  });

  it("some se o usuário escolher um tipo (começou do zero) enquanto a caixa está aberta", async () => {
    const { rerender } = render(<ContinuarCroqui />);
    await screen.findByText("Continuar?");
    estado = { ...ESTADO_INICIAL, tipo: "outros" };
    rerender(<ContinuarCroqui />);
    expect(screen.queryByText("Continuar?")).toBeNull();
  });

  it("falha ao abrir mostra aviso e mantém a caixa", async () => {
    abrir.mockResolvedValue(false);
    render(<ContinuarCroqui />);
    await userEvent.click(await screen.findByRole("button", { name: "Sim" }));
    expect(await screen.findByText(/Não foi possível abrir/)).toBeInTheDocument();
  });
});
