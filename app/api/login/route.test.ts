// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { criarBancoDeTeste } from "@/lib/servidor/banco-teste";
import { definirConsulta } from "@/lib/servidor/banco";
import { criarUsuario, definirAtivo } from "@/lib/servidor/usuarios";
import { POST as login } from "./route";
import { POST as logout } from "../logout/route";
import { GET as eu } from "../eu/route";

function entrar(usuario: string, senha: string, ip = "10.0.0.1") {
  return login(
    new Request("http://localhost/api/login", {
      method: "POST",
      headers: { "x-forwarded-for": ip },
      body: JSON.stringify({ usuario, senha }),
    })
  );
}

beforeEach(async () => {
  process.env.SESSAO_SEGREDO = "x".repeat(40);
  definirConsulta(await criarBancoDeTeste());
  await criarUsuario({ usuario: "ana", nome: "Ana", senha: "senha-da-ana" });
  await criarUsuario({ usuario: "bia", nome: "Bia", senha: "senha-da-bia" });
});

describe("POST /api/login", () => {
  it("credenciais certas: 200, dados do usuário e cookie httpOnly", async () => {
    const r = await entrar("Ana", "senha-da-ana");
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ usuario: "ana", nome: "Ana", admin: false });
    const cookie = r.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/^sessao=/);
    expect(cookie).toMatch(/HttpOnly/i);
  });

  it("senha errada, usuário inexistente e conta desativada dão o mesmo 401", async () => {
    await definirAtivo(2, false);
    const respostas = await Promise.all([
      entrar("ana", "errada"),
      entrar("fantasma", "qualquer-coisa"),
      entrar("bia", "senha-da-bia"),
    ]);
    for (const r of respostas) {
      expect(r.status).toBe(401);
      expect(await r.json()).toEqual({ erro: "Usuário ou senha inválidos" });
    }
  });

  it("5 falhas bloqueiam o usuário (429), mas não os outros", async () => {
    for (let i = 0; i < 5; i++) await entrar("ana", "errada");
    expect((await entrar("ana", "senha-da-ana")).status).toBe(429);
    expect((await entrar("bia", "senha-da-bia")).status).toBe(200);
  });

  it("30 falhas do mesmo IP bloqueiam esse IP, não outro", async () => {
    for (let i = 0; i < 30; i++) await entrar(`fantasma${i}`, "errada", "10.9.9.9");
    expect((await entrar("bia", "senha-da-bia", "10.9.9.9")).status).toBe(429);
    expect((await entrar("bia", "senha-da-bia", "10.1.1.1")).status).toBe(200);
  });

  it("login certo zera as falhas do usuário", async () => {
    for (let i = 0; i < 4; i++) await entrar("ana", "errada");
    expect((await entrar("ana", "senha-da-ana")).status).toBe(200);
    for (let i = 0; i < 4; i++) await entrar("ana", "errada");
    expect((await entrar("ana", "senha-da-ana")).status).toBe(200);
  });

  it("corpo inválido: 400", async () => {
    const r = await login(new Request("http://localhost/api/login", { method: "POST", body: "{" }));
    expect(r.status).toBe(400);
  });
});

describe("POST /api/logout e GET /api/eu", () => {
  it("logout apaga o cookie", async () => {
    const r = await logout();
    expect(r.status).toBe(200);
    expect(r.headers.get("set-cookie") ?? "").toMatch(/sessao=;|Max-Age=0/i);
  });

  it("eu devolve o usuário logado; sem cookie ou com conta desativada, 401", async () => {
    const cookie = ((await entrar("ana", "senha-da-ana")).headers.get("set-cookie") ?? "").split(";")[0];
    const chamar = (c?: string) =>
      eu(new Request("http://localhost/api/eu", { headers: c ? { cookie: c } : {} }));
    const ok = await chamar(cookie);
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ usuario: "ana", nome: "Ana", admin: false });
    expect((await chamar()).status).toBe(401);
    await definirAtivo(1, false);
    expect((await chamar(cookie)).status).toBe(401);
  });
});
