// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SignJWT } from "jose";
import { criarSessao, lerSessao, opcoesCookieSessao, COOKIE_SESSAO, type UsuarioSessao } from "./sessao";

const SEGREDO = "x".repeat(40);
const usuario: UsuarioSessao = { id: 7, usuario: "ana", nome: "Ana", admin: false };

beforeEach(() => {
  process.env.SESSAO_SEGREDO = SEGREDO;
});
afterEach(() => {
  vi.useRealTimers();
});

describe("sessao", () => {
  it("o token criado volta como o mesmo usuário", async () => {
    expect(await lerSessao(await criarSessao(usuario))).toEqual({ ...usuario, versao: 0 });
  });

  it("token adulterado, de outro segredo ou ausente vira null", async () => {
    const token = await criarSessao(usuario);
    expect(await lerSessao(token.slice(0, -2) + "xx")).toBeNull();
    const alheio = await new SignJWT({ ...usuario })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(new TextEncoder().encode("y".repeat(40)));
    expect(await lerSessao(alheio)).toBeNull();
    expect(await lerSessao(undefined)).toBeNull();
  });

  it("expira em 7 dias", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-20T10:00:00Z"));
    const token = await criarSessao(usuario);
    vi.setSystemTime(new Date("2026-11-27T09:59:00Z"));
    expect(await lerSessao(token)).toEqual({ ...usuario, versao: 0 });
    vi.setSystemTime(new Date("2026-11-27T10:01:00Z"));
    expect(await lerSessao(token)).toBeNull();
  });

  it("guarda a versão da sessão no token", async () => {
    expect((await lerSessao(await criarSessao(usuario, 3)))?.versao).toBe(3);
  });

  it("sem segredo (ou curto demais) não cria sessão", async () => {
    delete process.env.SESSAO_SEGREDO;
    await expect(criarSessao(usuario)).rejects.toThrow(/SESSAO_SEGREDO/);
    process.env.SESSAO_SEGREDO = "curto";
    await expect(criarSessao(usuario)).rejects.toThrow(/SESSAO_SEGREDO/);
  });

  it("as opções do cookie são httpOnly, lax e duram 7 dias", () => {
    expect(COOKIE_SESSAO).toBe("sessao");
    expect(opcoesCookieSessao()).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/", maxAge: 7 * 24 * 3600 });
  });
});
