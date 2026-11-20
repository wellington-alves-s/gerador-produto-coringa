import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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
  window.localStorage.clear();
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
    window.localStorage.setItem(CHAVE_RASCUNHO, "{}");
    render(<MenuUsuario />);
    await userEvent.click(await screen.findByRole("button", { name: "Sair" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/logout", expect.objectContaining({ method: "POST" }));
    expect(window.localStorage.getItem(CHAVE_RASCUNHO)).toBeNull();
    expect(push).toHaveBeenCalledWith("/login");
  });

  it("não aparece na tela de login", () => {
    caminho = "/login";
    usuarioLogado(false);
    const { container } = render(<MenuUsuario />);
    expect(container).toBeEmptyDOMElement();
  });
});
