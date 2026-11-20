import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ESTADO_INICIAL } from "@/lib/pedido";
import PaginaMeusCroquis from "./page";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const despachos: { type: string; estado?: Record<string, unknown> }[] = [];
vi.mock("@/lib/wizard-context", async () => {
  const React = await import("react");
  const { ESTADO_INICIAL: inicial } = await import("@/lib/pedido");
  return {
    useWizard: () => {
      const [estado, setEstado] = React.useState(inicial);
      return {
        estado,
        dispatch: (acao: { type: string; estado?: typeof inicial }) => {
          despachos.push(acao);
          if (acao.type === "CARREGAR_ESTADO" && acao.estado) setEstado(acao.estado);
        },
      };
    },
  };
});

let usuario = { id: 1, usuario: "ana", nome: "Ana", admin: false };
vi.mock("@/lib/usuario-cliente", () => ({ useUsuario: () => ({ usuario, carregando: false }) }));

const fetchMock = vi.fn();
const item = (id: number, cliente: string, vendedor = { id: 1, nome: "Ana" }) => ({
  id,
  cliente,
  numeroPedido: `P${id}`,
  tipo: "esquadria",
  atualizadoEm: "2026-11-20T12:00:00.000Z",
  vendedor,
});
const json = (corpo: unknown, ok = true) => ({ ok, status: ok ? 200 : 500, json: async () => corpo });

beforeEach(() => {
  push.mockClear();
  despachos.length = 0;
  usuario = { id: 1, usuario: "ana", nome: "Ana", admin: false };
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string) => {
    if (url.startsWith("/api/croquis?")) return json({ itens: [item(10, "José Álvares"), item(11, "Maria")], total: 2 });
    if (url === "/api/admin/usuarios") return json([{ id: 1, nome: "Ana" }, { id: 2, nome: "Bia" }]);
    return json({});
  });
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("confirm", vi.fn(() => true));
});

describe("Meus croquis", () => {
  it("lista os croquis e mostra o aviso da limpeza automática", async () => {
    render(<PaginaMeusCroquis />);
    expect(await screen.findByText("José Álvares")).toBeInTheDocument();
    expect(screen.getByText("Maria")).toBeInTheDocument();
    expect(screen.getByText(/apagados automaticamente/)).toBeInTheDocument();
  });

  it("digitar na busca refaz a chamada com o termo", async () => {
    render(<PaginaMeusCroquis />);
    await screen.findByText("Maria");
    await userEvent.type(screen.getByRole("searchbox"), "jose");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("busca=jose")), { timeout: 2000 });
  });

  it("vendedor comum não vê a coluna Vendedor nem o filtro", async () => {
    render(<PaginaMeusCroquis />);
    await screen.findByText("Maria");
    expect(screen.queryByText("Vendedor")).toBeNull();
    expect(screen.queryByLabelText("Filtrar por vendedor")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalledWith("/api/admin/usuarios");
  });

  it("admin vê o vendedor de cada croqui e filtra por vendedor", async () => {
    usuario = { id: 9, usuario: "chefe", nome: "Chefe", admin: true };
    render(<PaginaMeusCroquis />);
    await screen.findByText("Maria");
    expect(screen.getByText("Vendedor")).toBeInTheDocument();
    await userEvent.selectOptions(await screen.findByLabelText("Filtrar por vendedor"), "2");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("vendedor=2")));
  });

  it("abrir um croqui próprio carrega o estado com croquiId e vai para a Revisão", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url === "/api/croquis/10"
        ? json({ id: 10, usuarioId: 1, estado: { ...ESTADO_INICIAL, tipo: "esquadria" } })
        : json({ itens: [item(10, "José Álvares")], total: 1 })
    );
    render(<PaginaMeusCroquis />);
    await userEvent.click(await screen.findByRole("button", { name: "Abrir" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/criar/revisao"));
    const carregar = despachos.find((d) => d.type === "CARREGAR_ESTADO");
    expect(carregar?.estado).toMatchObject({ croquiId: 10, ultimaEtapa: "revisao", tipo: "esquadria" });
  });

  it("abrir croqui de outro vendedor (admin) carrega como cópia, sem croquiId", async () => {
    usuario = { id: 9, usuario: "chefe", nome: "Chefe", admin: true };
    fetchMock.mockImplementation(async (url: string) =>
      url === "/api/croquis/10"
        ? json({ id: 10, usuarioId: 1, estado: { ...ESTADO_INICIAL, tipo: "esquadria" } })
        : url === "/api/admin/usuarios"
          ? json([])
          : json({ itens: [item(10, "Da Ana")], total: 1 })
    );
    render(<PaginaMeusCroquis />);
    await userEvent.click(await screen.findByRole("button", { name: "Abrir" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/criar/revisao"));
    expect(despachos.find((d) => d.type === "CARREGAR_ESTADO")?.estado?.croquiId).toBeNull();
  });

  it("excluir só chama DELETE depois de confirmar e tira o item da lista", async () => {
    render(<PaginaMeusCroquis />);
    const botoes = await screen.findAllByRole("button", { name: "Excluir" });
    vi.stubGlobal("confirm", vi.fn(() => false));
    await userEvent.click(botoes[0]);
    expect(fetchMock).not.toHaveBeenCalledWith("/api/croquis/10", expect.anything());

    vi.stubGlobal("confirm", vi.fn(() => true));
    await userEvent.click(botoes[0]);
    expect(fetchMock).toHaveBeenCalledWith("/api/croquis/10", expect.objectContaining({ method: "DELETE" }));
    await waitFor(() => expect(screen.queryByText("José Álvares")).toBeNull());
    expect(screen.getByText("Maria")).toBeInTheDocument();
  });

  it("erro de rede mostra mensagem", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    render(<PaginaMeusCroquis />);
    expect(await screen.findByText(/Não foi possível carregar/)).toBeInTheDocument();
  });

  it("Duplicar cria a cópia, recarrega a lista e mostra o nome da cópia", async () => {
    fetchMock.mockImplementation(async (url: string, init?: { method?: string }) => {
      if (url === "/api/croquis/10/duplicar" && init?.method === "POST") return json({ id: 20, cliente: "José Álvares (2)" });
      if (url.startsWith("/api/croquis?")) return json({ itens: [item(10, "José Álvares")], total: 1 });
      return json({});
    });
    render(<PaginaMeusCroquis />);
    const listasAntes = () => fetchMock.mock.calls.filter(([u]) => String(u).startsWith("/api/croquis?")).length;
    await userEvent.click(await screen.findByRole("button", { name: "Duplicar" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/croquis/10/duplicar", expect.objectContaining({ method: "POST" }));
    expect(await screen.findByRole("status")).toHaveTextContent("José Álvares (2)");
    await waitFor(() => expect(listasAntes()).toBeGreaterThanOrEqual(2));
  });

  it("falha ao duplicar mostra mensagem e não mexe na lista", async () => {
    fetchMock.mockImplementation(async (url: string, init?: { method?: string }) =>
      init?.method === "POST" ? json({}, false) : json({ itens: [item(10, "José Álvares")], total: 1 })
    );
    render(<PaginaMeusCroquis />);
    await userEvent.click(await screen.findByRole("button", { name: "Duplicar" }));
    expect(await screen.findByText(/Não foi possível duplicar/)).toBeInTheDocument();
    expect(screen.getByText("José Álvares")).toBeInTheDocument();
  });
});

