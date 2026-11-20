// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { criarBancoDeTeste } from "@/lib/servidor/banco-teste";
import { definirConsulta } from "@/lib/servidor/banco";
import { cookieDeSessao } from "@/lib/servidor/sessao-teste";
import { criarUsuario } from "@/lib/servidor/usuarios";
import { POST as login } from "@/app/api/login/route";
import { GET as eu } from "@/app/api/eu/route";
import { GET as listar, POST as criar } from "./route";
import { PATCH as alterar } from "./[id]/route";

let cookieAdmin = "";
let cookieAna = "";

const chamar = (url: string, metodo: string, corpo?: unknown, cookie: string | null = cookieAdmin) =>
  new Request(url, {
    method: metodo,
    headers: cookie ? { cookie } : {},
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
const comId = (id: number | string) => ({ params: Promise.resolve({ id: String(id) }) });
const patch = (id: number | string, corpo: unknown, cookie: string | null = cookieAdmin) =>
  alterar(chamar(`http://localhost/api/admin/usuarios/${id}`, "PATCH", corpo, cookie), comId(id));

beforeEach(async () => {
  definirConsulta(await criarBancoDeTeste());
  const chefe = await criarUsuario({ usuario: "chefe", nome: "Chefe", senha: "senha-do-chefe", admin: true });
  const ana = await criarUsuario({ usuario: "ana", nome: "Ana", senha: "senha-da-ana" });
  cookieAdmin = await cookieDeSessao(chefe);
  cookieAna = await cookieDeSessao(ana);
});

describe("/api/admin/usuarios", () => {
  it("vendedor comum: 403 em todas as rotas; sem sessão: 401", async () => {
    expect((await listar(chamar("http://localhost/api/admin/usuarios", "GET", undefined, cookieAna))).status).toBe(403);
    expect((await criar(chamar("http://localhost/api/admin/usuarios", "POST", {}, cookieAna))).status).toBe(403);
    expect((await patch(1, { ativo: false }, cookieAna)).status).toBe(403);
    expect((await listar(chamar("http://localhost/api/admin/usuarios", "GET", undefined, null))).status).toBe(401);
  });

  it("admin lista as contas sem expor o hash", async () => {
    const r = await listar(chamar("http://localhost/api/admin/usuarios", "GET"));
    const corpo = await r.json();
    expect(corpo.map((u: { usuario: string }) => u.usuario).sort()).toEqual(["ana", "chefe"]);
    expect(JSON.stringify(corpo)).not.toMatch(/scrypt|senhaHash|senha_hash/);
  });

  it("cria conta (201); usuário repetido é 409; senha curta e usuário inválido são 400", async () => {
    const nova = { usuario: "bia", nome: "Bia", senha: "senha-da-bia" };
    expect((await criar(chamar("http://localhost/api/admin/usuarios", "POST", nova))).status).toBe(201);
    expect((await criar(chamar("http://localhost/api/admin/usuarios", "POST", nova))).status).toBe(409);
    expect((await criar(chamar("http://localhost/api/admin/usuarios", "POST", { ...nova, usuario: "x", senha: "123" }))).status).toBe(400);
    expect((await criar(chamar("http://localhost/api/admin/usuarios", "POST", "{"))).status).toBe(400);
  });

  it("trocar a senha: a nova entra e a antiga não", async () => {
    expect((await patch(2, { senha: "nova-senha-123" })).status).toBe(204);
    const entrar = (senha: string) =>
      login(new Request("http://localhost/api/login", { method: "POST", body: JSON.stringify({ usuario: "ana", senha }) }));
    expect((await entrar("nova-senha-123")).status).toBe(200);
    expect((await entrar("senha-da-ana")).status).toBe(401);
  });

  it("trocar a senha derruba a sessão que já estava aberta, e o novo login funciona", async () => {
    const eu2 = () => eu(new Request("http://localhost/api/eu", { headers: { cookie: cookieAna } }));
    expect((await eu2()).status).toBe(200);
    await patch(2, { senha: "nova-senha-123" });
    expect((await eu2()).status).toBe(401);
    const r = await login(
      new Request("http://localhost/api/login", { method: "POST", body: JSON.stringify({ usuario: "ana", senha: "nova-senha-123" }) })
    );
    const novoCookie = (r.headers.get("set-cookie") ?? "").split(";")[0];
    expect((await eu(new Request("http://localhost/api/eu", { headers: { cookie: novoCookie } }))).status).toBe(200);
  });

  it("senha nova curta: 400", async () => {
    expect((await patch(2, { senha: "curta" })).status).toBe(400);
  });

  it("desativar impede novo login e derruba a sessão que já existia", async () => {
    expect((await eu(new Request("http://localhost/api/eu", { headers: { cookie: cookieAna } }))).status).toBe(200);
    expect((await patch(2, { ativo: false })).status).toBe(204);
    expect((await eu(new Request("http://localhost/api/eu", { headers: { cookie: cookieAna } }))).status).toBe(401);
    const r = await login(
      new Request("http://localhost/api/login", { method: "POST", body: JSON.stringify({ usuario: "ana", senha: "senha-da-ana" }) })
    );
    expect(r.status).toBe(401);
    expect((await patch(2, { ativo: true })).status).toBe(204);
  });

  it("o admin não pode desativar a si mesmo", async () => {
    expect((await patch(1, { ativo: false })).status).toBe(400);
    const lista = await (await listar(chamar("http://localhost/api/admin/usuarios", "GET"))).json();
    expect(lista.find((u: { usuario: string }) => u.usuario === "chefe").ativo).toBe(true);
  });

  it("conta inexistente, id inválido ou corpo sem campo válido", async () => {
    expect((await patch(99, { ativo: false })).status).toBe(404);
    expect((await patch("abc", { ativo: false })).status).toBe(404);
    expect((await patch(2, {})).status).toBe(400);
  });
});
