// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { criarBancoDeTeste } from "./banco-teste";
import { consultar, definirConsulta } from "./banco";
import { ErroValidacao } from "./erros";
import { criarUsuario } from "./usuarios";
import { executarLimpeza, lerRetencao, lerUltimaLimpeza, salvarRetencao } from "./limpeza";

let ana: number;
let bia: number;

/** Insere um croqui com `dias` dias de idade. */
async function croqui(usuarioId: number, dias: number, cliente = "X") {
  await consultar(
    "INSERT INTO croquis (usuario_id, cliente, tipo, estado, atualizado_em) VALUES ($1, $2, 'esquadria', '{}'::jsonb, now() - make_interval(days => $3))",
    [usuarioId, cliente, dias]
  );
}
const restantes = async (usuarioId: number) =>
  (await consultar<{ cliente: string }>("SELECT cliente FROM croquis WHERE usuario_id = $1 ORDER BY atualizado_em DESC", [usuarioId])).map(
    (l) => l.cliente
  );

beforeEach(async () => {
  definirConsulta(await criarBancoDeTeste());
  ana = (await criarUsuario({ usuario: "ana", nome: "Ana", senha: "senha-forte-1" })).id;
  bia = (await criarUsuario({ usuario: "bia", nome: "Bia", senha: "senha-forte-1" })).id;
});

describe("retenção", () => {
  it("sem configuração salva vale o padrão: 100 por vendedor, sem limite de idade", async () => {
    expect(await lerRetencao()).toEqual({ maxPorVendedor: 100, maxDias: null });
  });

  it("salva e lê de volta", async () => {
    await salvarRetencao({ maxPorVendedor: 50, maxDias: 90 });
    expect(await lerRetencao()).toEqual({ maxPorVendedor: 50, maxDias: 90 });
    await salvarRetencao({ maxPorVendedor: 50, maxDias: null });
    expect(await lerRetencao()).toEqual({ maxPorVendedor: 50, maxDias: null });
  });

  it("rejeita valores fora dos limites", async () => {
    for (const r of [
      { maxPorVendedor: 0, maxDias: null },
      { maxPorVendedor: 10001, maxDias: null },
      { maxPorVendedor: 1.5, maxDias: null },
      { maxPorVendedor: 10, maxDias: 0 },
      { maxPorVendedor: 10, maxDias: 3651 },
      { maxPorVendedor: 10, maxDias: 1.5 },
    ]) {
      await expect(salvarRetencao(r)).rejects.toBeInstanceOf(ErroValidacao);
    }
  });
});

describe("executarLimpeza", () => {
  it("mantém os N mais recentes de cada vendedor e não toca em quem está dentro do limite", async () => {
    for (const [i, dias] of [1, 2, 3, 4].entries()) await croqui(ana, dias, `ana-${i + 1}`);
    await croqui(bia, 10, "bia-1");
    await salvarRetencao({ maxPorVendedor: 2, maxDias: null });

    const r = await executarLimpeza();
    expect(r.removidos).toBe(2);
    expect(await restantes(ana)).toEqual(["ana-1", "ana-2"]);
    expect(await restantes(bia)).toEqual(["bia-1"]);
  });

  it("apaga o que é mais velho que maxDias (31 dias sai, 29 fica)", async () => {
    await croqui(ana, 31, "velho");
    await croqui(ana, 29, "novo");
    await salvarRetencao({ maxPorVendedor: 100, maxDias: 30 });
    expect((await executarLimpeza()).removidos).toBe(1);
    expect(await restantes(ana)).toEqual(["novo"]);
  });

  it("nunca apaga contas", async () => {
    await croqui(ana, 400);
    await salvarRetencao({ maxPorVendedor: 1, maxDias: 1 });
    await executarLimpeza();
    expect(await consultar("SELECT id FROM usuarios")).toHaveLength(2);
  });

  it("com o padrão e poucos croquis não apaga nada", async () => {
    await croqui(ana, 1);
    expect((await executarLimpeza()).removidos).toBe(0);
  });

  it("guarda o resultado para o painel", async () => {
    expect(await lerUltimaLimpeza()).toBeNull();
    await croqui(ana, 1);
    await croqui(ana, 2);
    await salvarRetencao({ maxPorVendedor: 1, maxDias: null });
    await executarLimpeza();
    const ultima = await lerUltimaLimpeza();
    expect(ultima?.removidos).toBe(1);
    expect(Number.isNaN(Date.parse(ultima!.quando))).toBe(false);
  });
});
