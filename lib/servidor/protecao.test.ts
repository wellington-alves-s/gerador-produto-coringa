// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { criarBancoDeTeste } from "./banco-teste";
import { definirConsulta } from "./banco";
import { criarUsuario, definirAtivo, trocarSenha } from "./usuarios";
import { COOKIE_SESSAO, criarSessao } from "./sessao";
import { exigirAdmin, exigirUsuario, identificarCliente, verificarAcesso } from "./protecao";

async function requisicaoDe(id: number, usuario: string, admin = false) {
  const token = await criarSessao({ id, usuario, nome: usuario, admin });
  return new Request("http://localhost/x", { headers: { cookie: `${COOKIE_SESSAO}=${token}` } });
}

beforeEach(async () => {
  process.env.SESSAO_SEGREDO = "x".repeat(40);
  definirConsulta(await criarBancoDeTeste());
  await criarUsuario({ usuario: "ana", nome: "Ana", senha: "senha-da-ana" });
  await criarUsuario({ usuario: "chefe", nome: "Chefe", senha: "senha-do-chefe", admin: true });
});

describe("protecao", () => {
  it("sem cookie: 401", async () => {
    const r = await exigirUsuario(new Request("http://localhost/x"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.resposta.status).toBe(401);
  });

  it("cookie válido de conta ativa: ok, com os dados atuais do banco", async () => {
    const r = await exigirUsuario(await requisicaoDe(1, "ana"));
    expect(r).toEqual({ ok: true, usuario: { id: 1, usuario: "ana", nome: "Ana", admin: false } });
  });

  it("cookie válido de conta desativada: 401 na hora", async () => {
    const req = await requisicaoDe(1, "ana");
    await definirAtivo(1, false);
    const r = await exigirUsuario(req);
    expect(r.ok).toBe(false);
  });

  it("sessão emitida antes de uma troca de senha deixa de valer", async () => {
    const req = await requisicaoDe(1, "ana");
    expect((await exigirUsuario(req)).ok).toBe(true);
    await trocarSenha(1, "nova-senha-123");
    expect((await exigirUsuario(req)).ok).toBe(false);
  });

  it("desativar e reativar não ressuscita sessões antigas", async () => {
    const req = await requisicaoDe(1, "ana");
    await definirAtivo(1, false);
    await definirAtivo(1, true);
    expect((await exigirUsuario(req)).ok).toBe(false);
  });

  it("não confia no admin do cookie: vale o do banco", async () => {
    const r = await exigirAdmin(await requisicaoDe(1, "ana", true));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.resposta.status).toBe(403);
  });

  it("admin de verdade passa em exigirAdmin", async () => {
    expect((await exigirAdmin(await requisicaoDe(2, "chefe"))).ok).toBe(true);
  });

  it("verificarAcesso libera com sessão e devolve 401 sem ela", async () => {
    expect(await verificarAcesso(await requisicaoDe(1, "ana"))).toEqual({ permitido: true });
    expect(await verificarAcesso(new Request("http://localhost/x"))).toMatchObject({ permitido: false, status: 401 });
  });

  it("identifica o cliente pelo primeiro IP de x-forwarded-for", () => {
    const req = new Request("http://localhost", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    expect(identificarCliente(req)).toBe("1.2.3.4");
    expect(identificarCliente(new Request("http://localhost"))).toBe("desconhecido");
  });
});
