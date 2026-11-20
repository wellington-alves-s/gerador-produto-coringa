// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { criarBancoDeTeste } from "@/lib/servidor/banco-teste";
import { definirConsulta } from "@/lib/servidor/banco";
import { cookieDeSessao } from "@/lib/servidor/sessao-teste";
import { criarUsuario } from "@/lib/servidor/usuarios";
import { lerRetencao } from "@/lib/servidor/limpeza";
import { GET, PUT } from "./route";

let cookieAdmin = "";
let cookieAna = "";
const get = (cookie: string | null) => GET(new Request("http://localhost/api/admin/retencao", { headers: cookie ? { cookie } : {} }));
const put = (corpo: unknown, cookie: string | null = cookieAdmin) =>
  PUT(
    new Request("http://localhost/api/admin/retencao", {
      method: "PUT",
      headers: cookie ? { cookie } : {},
      body: typeof corpo === "string" ? corpo : JSON.stringify(corpo),
    })
  );

beforeEach(async () => {
  definirConsulta(await criarBancoDeTeste());
  cookieAdmin = await cookieDeSessao(await criarUsuario({ usuario: "chefe", nome: "Chefe", senha: "senha-forte-1", admin: true }));
  cookieAna = await cookieDeSessao(await criarUsuario({ usuario: "ana", nome: "Ana", senha: "senha-forte-1" }));
});

describe("/api/admin/retencao", () => {
  it("vendedor: 403; sem sessão: 401", async () => {
    expect((await get(cookieAna)).status).toBe(403);
    expect((await put({ maxPorVendedor: 5, maxDias: null }, cookieAna)).status).toBe(403);
    expect((await get(null)).status).toBe(401);
  });

  it("admin lê o padrão, grava e a nova regra vale", async () => {
    expect(await (await get(cookieAdmin)).json()).toEqual({
      retencao: { maxPorVendedor: 100, maxDias: null },
      ultimaLimpeza: null,
    });
    const r = await put({ maxPorVendedor: 40, maxDias: 120 });
    expect(r.status).toBe(200);
    expect(await lerRetencao()).toEqual({ maxPorVendedor: 40, maxDias: 120 });
  });

  it("valores inválidos ou corpo quebrado: 400", async () => {
    expect((await put({ maxPorVendedor: 0, maxDias: null })).status).toBe(400);
    expect((await put({ maxPorVendedor: "10", maxDias: null })).status).toBe(400);
    expect((await put("{")).status).toBe(400);
  });
});
