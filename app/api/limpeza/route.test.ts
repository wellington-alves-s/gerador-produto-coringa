// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { criarBancoDeTeste } from "@/lib/servidor/banco-teste";
import { consultar, definirConsulta } from "@/lib/servidor/banco";
import { criarUsuario } from "@/lib/servidor/usuarios";
import { salvarRetencao } from "@/lib/servidor/limpeza";
import { GET } from "./route";

const chamar = (autorizacao?: string) =>
  GET(new Request("http://localhost/api/limpeza", { headers: autorizacao ? { authorization: autorizacao } : {} }));

beforeEach(async () => {
  definirConsulta(await criarBancoDeTeste());
  process.env.CRON_SECRET = "segredo-do-cron";
  const ana = await criarUsuario({ usuario: "ana", nome: "Ana", senha: "senha-forte-1" });
  for (let i = 0; i < 3; i++) {
    await consultar("INSERT INTO croquis (usuario_id, tipo, estado) VALUES ($1, 'esquadria', '{}'::jsonb)", [ana.id]);
  }
  await salvarRetencao({ maxPorVendedor: 1, maxDias: null });
});
afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe("GET /api/limpeza", () => {
  it("sem cabeçalho ou com segredo errado: 401 e nada é apagado", async () => {
    expect((await chamar()).status).toBe(401);
    expect((await chamar("Bearer errado")).status).toBe(401);
    expect(await consultar("SELECT id FROM croquis")).toHaveLength(3);
  });

  it("sem CRON_SECRET configurado, nunca autoriza (nem com 'Bearer undefined')", async () => {
    delete process.env.CRON_SECRET;
    expect((await chamar("Bearer undefined")).status).toBe(401);
    expect((await chamar("Bearer ")).status).toBe(401);
    expect(await consultar("SELECT id FROM croquis")).toHaveLength(3);
  });

  it("com o segredo certo executa a limpeza e devolve quantos removeu", async () => {
    const r = await chamar("Bearer segredo-do-cron");
    expect(r.status).toBe(200);
    expect((await r.json()).removidos).toBe(2);
    expect(await consultar("SELECT id FROM croquis")).toHaveLength(1);
  });
});
