import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MenuUsuario } from "./MenuUsuario";
import { CHAVE_RASCUNHO } from "@/lib/wizard-storage";

const push = vi.fn();
let caminho = "/criar/tipo";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => caminho }));

const fetchMock = vi.fn();
function usuarioLogado(admin: boolean) {
  fetchMock.mockImplementation(async (url: string) =>
    url === "/api/eu"
      ? { ok: true, json: async () => ({ usuario: "ana", nome: "Ana Souza", admin }) }
      : { ok: true, json: async () => ({}) }
  );
}

beforeEach(() => {
  push.mockClear();
  caminho = "/criar/tipo";
  window.sessionStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("MenuUsuario", () => {
  it("mostra o nome e o link Meus croquis; vendedor não vê Admin", async () => {
    usuarioLogado(false);
    render(<MenuUsuario />);
    expect(await screen.findByText("Ana Souza")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Meus croquis" })).toHaveAttribute("href", "/criar/croquis");
    expect(screen.queryByRole("link", { name: "Admin" })).toBeNull();
  });

  it("admin vê o link Admin", async () => {
    usuarioLogado(true);
    render(<MenuUsuario />);
    expect(await screen.findByRole("link", { name: "Admin" })).toHaveAttribute("href", "/admin");
  });

  it("Sair chama o logout, apaga o rascunho local e vai para /login", async () => {
    usuarioLogado(false);
    window.sessionStorage.setItem(CHAVE_RASCUNHO, "{}");
    render(<MenuUsuario />);
    await userEvent.click(await screen.findByRole("button", { name: "Sair" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/logout", expect.objectContaining({ method: "POST" }));
    expect(window.sessionStorage.getItem(CHAVE_RASCUNHO)).toBeNull();
    expect(push).toHaveBeenCalledWith("/login");
  });

  it("não aparece na tela de login", () => {
    caminho = "/login";
    usuarioLogado(false);
    const { container } = render(<MenuUsuario />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("MenuUsuario — troca de usuário sem recarregar a página", () => {
  it("depois de entrar (navegação no cliente) o menu aparece; depois de trocar de conta mostra a nova", async () => {
    let logado: { usuario: string; nome: string; admin: boolean } | null = null;
    fetchMock.mockImplementation(async (url: string) =>
      url === "/api/eu" ? (logado ? { ok: true, json: async () => logado } : { ok: false, json: async () => ({}) }) : { ok: true, json: async () => ({}) }
    );
    caminho = "/login";
    const { rerender, container } = render(<MenuUsuario />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/eu"));
    expect(container).toBeEmptyDOMElement();

    logado = { usuario: "ana", nome: "Ana Souza", admin: true };
    caminho = "/criar/tipo";
    rerender(<MenuUsuario />);
    expect(await screen.findByText("Ana Souza")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Admin" })).toBeInTheDocument();

    logado = { usuario: "bia", nome: "Bia Lima", admin: false };
    caminho = "/login";
    rerender(<MenuUsuario />);
    caminho = "/criar/tipo";
    rerender(<MenuUsuario />);
    expect(await screen.findByText("Bia Lima")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Admin" })).toBeNull();
    expect(screen.queryByText("Ana Souza")).toBeNull();
  });
});
