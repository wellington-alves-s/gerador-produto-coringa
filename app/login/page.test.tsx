import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PaginaLogin from "./page";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

const fetchMock = vi.fn();
beforeEach(() => {
  push.mockClear();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

async function preencherEEnviar() {
  const user = userEvent.setup();
  render(<PaginaLogin />);
  await user.type(screen.getByLabelText("Usuário"), "ana");
  await user.type(screen.getByLabelText("Senha"), "senha-da-ana");
  await user.click(screen.getByRole("button", { name: "Entrar" }));
}

describe("Página de login", () => {
  it("envia usuário e senha e vai para o assistente", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    await preencherEEnviar();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/login",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ usuario: "ana", senha: "senha-da-ana" }) })
    );
    expect(push).toHaveBeenCalledWith("/criar/tipo");
  });

  it("mostra a mensagem do servidor quando as credenciais estão erradas e não navega", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({ erro: "Usuário ou senha inválidos" }) });
    await preencherEEnviar();
    expect(await screen.findByText("Usuário ou senha inválidos")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("mostra o aviso de muitas tentativas (429)", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429, json: async () => ({ erro: "Muitas tentativas. Aguarde." }) });
    await preencherEEnviar();
    expect(await screen.findByText(/Muitas tentativas/)).toBeInTheDocument();
  });

  it("falha de rede mostra erro genérico", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    await preencherEEnviar();
    expect(await screen.findByText(/Não foi possível entrar/)).toBeInTheDocument();
  });
});
