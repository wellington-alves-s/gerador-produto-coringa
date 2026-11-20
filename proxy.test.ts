// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { COOKIE_SESSAO, criarSessao } from "@/lib/servidor/sessao";
import { proxy } from "./proxy";

beforeEach(() => {
  process.env.SESSAO_SEGREDO = "x".repeat(40);
});

describe("proxy", () => {
  it("sem sessão, redireciona páginas para /login", async () => {
    const r = await proxy(new NextRequest("http://localhost/criar/tipo"));
    expect(r.status).toBe(307);
    expect(new URL(r.headers.get("location")!).pathname).toBe("/login");
  });

  it("com sessão válida, deixa passar", async () => {
    const token = await criarSessao({ id: 1, usuario: "ana", nome: "Ana", admin: false });
    const r = await proxy(new NextRequest("http://localhost/criar/tipo", { headers: { cookie: `${COOKIE_SESSAO}=${token}` } }));
    expect(r.headers.get("location")).toBeNull();
  });

  it("cookie adulterado também vai para /login", async () => {
    const r = await proxy(new NextRequest("http://localhost/criar/tipo", { headers: { cookie: `${COOKIE_SESSAO}=lixo` } }));
    expect(new URL(r.headers.get("location")!).pathname).toBe("/login");
  });

  it("/login sempre passa", async () => {
    const r = await proxy(new NextRequest("http://localhost/login"));
    expect(r.headers.get("location")).toBeNull();
  });
});
