import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PaginaAdmin from "./page";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }) }));

let usuarioAtual: { id: number; usuario: string; nome: string; admin: boolean } | null;
let carregando = false;
vi.mock("@/lib/usuario-cliente", () => ({ useUsuario: () => ({ usuario: usuarioAtual, carregando }) }));

const fetchMock = vi.fn();
const conta = (id: number, usuario: string, ativo = true) => ({ id, usuario, nome: usuario.toUpperCase(), admin: false, ativo });
let contas = [conta(2, "ana"), conta(3, "bia", false)];
const resposta = (corpo: unknown, status = 200) => ({ ok: status < 400, status, json: async () => corpo });

beforeEach(() => {
  replace.mockClear();
  usuarioAtual = { id: 1, usuario: "chefe", nome: "Chefe", admin: true };
  carregando = false;
  contas = [conta(2, "ana"), conta(3, "bia", false)];
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string, init?: { method?: string }) => {
    if (url === "/api/admin/retencao" && !init?.method) {
      return resposta({ retencao: { maxPorVendedor: 100, maxDias: null }, ultimaLimpeza: { removidos: 3, quando: "2026-11-20T06:00:00.000Z" } });
    }
    if (url === "/api/admin/retencao" && init?.method === "PUT") {
      return resposta({ retencao: JSON.parse((init as { body: string }).body), ultimaLimpeza: null });
    }
    if (url === "/api/admin/usuarios" && !init?.method) return resposta(contas);
    if (url === "/api/admin/usuarios" && init?.method === "POST") return resposta({}, 201);
    return resposta({}, 204);
  });
  vi.stubGlobal("fetch", fetchMock);
});

describe("Painel do admin — contas", () => {
  it("lista as contas com o estado de cada uma", async () => {
    render(<PaginaAdmin />);
    expect(await screen.findByText("ana")).toBeInTheDocument();
    expect(screen.getByText("bia")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desativar ana" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ativar bia" })).toBeInTheDocument();
  });

  it("quem não é admin é mandado para o assistente", async () => {
    usuarioAtual = { id: 2, usuario: "ana", nome: "Ana", admin: false };
    render(<PaginaAdmin />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/criar/tipo"));
    expect(screen.queryByText("Nova conta")).toBeNull();
  });

  it("cria uma conta pelo formulário e recarrega a lista", async () => {
    render(<PaginaAdmin />);
    await screen.findByText("ana");
    await userEvent.type(screen.getByLabelText("Usuário"), "carla");
    await userEvent.type(screen.getByLabelText("Nome"), "Carla");
    await userEvent.type(screen.getByLabelText("Senha inicial"), "senha-da-carla");
    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/usuarios",
        expect.objectContaining({ method: "POST", body: JSON.stringify({ usuario: "carla", nome: "Carla", senha: "senha-da-carla" }) })
      )
    );
  });

  it("mostra o erro do servidor ao criar conta repetida", async () => {
    fetchMock.mockImplementation(async (url: string, init?: { method?: string }) =>
      init?.method === "POST" ? resposta({ erro: "Esse usuário já existe." }, 409) : resposta(contas)
    );
    render(<PaginaAdmin />);
    await screen.findByText("ana");
    await userEvent.type(screen.getByLabelText("Usuário"), "ana");
    await userEvent.type(screen.getByLabelText("Nome"), "Ana");
    await userEvent.type(screen.getByLabelText("Senha inicial"), "senha-forte-1");
    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    expect(await screen.findByText("Esse usuário já existe.")).toBeInTheDocument();
  });

  it("Desativar e Ativar chamam PATCH com o novo estado", async () => {
    render(<PaginaAdmin />);
    await userEvent.click(await screen.findByRole("button", { name: "Desativar ana" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/usuarios/2",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ ativo: false }) })
    );
    await userEvent.click(screen.getByRole("button", { name: "Ativar bia" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/usuarios/3",
      expect.objectContaining({ body: JSON.stringify({ ativo: true }) })
    );
  });

  it("Trocar senha pergunta a nova senha e envia por PATCH", async () => {
    vi.stubGlobal("prompt", vi.fn(() => "nova-senha-123"));
    render(<PaginaAdmin />);
    await userEvent.click(await screen.findByRole("button", { name: "Trocar senha de ana" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/usuarios/2",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ senha: "nova-senha-123" }) })
    );
  });

  it("cancelar a pergunta de senha não chama o servidor", async () => {
    vi.stubGlobal("prompt", vi.fn(() => null));
    render(<PaginaAdmin />);
    await userEvent.click(await screen.findByRole("button", { name: "Trocar senha de ana" }));
    expect(fetchMock).not.toHaveBeenCalledWith("/api/admin/usuarios/2", expect.anything());
  });
});

describe("Painel do admin — limpeza automática", () => {
  it("mostra a regra atual (100 por vendedor, sem limite de idade) e a última limpeza", async () => {
    render(<PaginaAdmin />);
    expect(await screen.findByLabelText("Croquis mantidos por vendedor")).toHaveValue(100);
    expect(screen.getByLabelText("Apagar os mais velhos que (dias)")).toHaveValue(null);
    expect(screen.getByText(/3 croquis removidos/)).toBeInTheDocument();
  });

  it("salva a nova regra; dias em branco vira null", async () => {
    render(<PaginaAdmin />);
    const quantidade = await screen.findByLabelText("Croquis mantidos por vendedor");
    await userEvent.clear(quantidade);
    await userEvent.type(quantidade, "50");
    await userEvent.type(screen.getByLabelText("Apagar os mais velhos que (dias)"), "90");
    await userEvent.click(screen.getByRole("button", { name: "Salvar limpeza" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/retencao",
      expect.objectContaining({ method: "PUT", body: JSON.stringify({ maxPorVendedor: 50, maxDias: 90 }) })
    );
    await userEvent.clear(screen.getByLabelText("Apagar os mais velhos que (dias)"));
    await userEvent.click(screen.getByRole("button", { name: "Salvar limpeza" }));
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/admin/retencao",
      expect.objectContaining({ body: JSON.stringify({ maxPorVendedor: 50, maxDias: null }) })
    );
  });

  it("mostra o erro do servidor quando a regra é inválida", async () => {
    render(<PaginaAdmin />);
    await screen.findByLabelText("Croquis mantidos por vendedor");
    fetchMock.mockImplementation(async (url: string, init?: { method?: string }) =>
      init?.method === "PUT" ? resposta({ erro: "Informe um número inteiro de croquis por vendedor entre 1 e 10000." }, 400) : resposta(contas)
    );
    await userEvent.click(screen.getByRole("button", { name: "Salvar limpeza" }));
    expect(await screen.findByText(/entre 1 e 10000/)).toBeInTheDocument();
  });
});
