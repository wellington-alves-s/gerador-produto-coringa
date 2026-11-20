// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { criarBancoDeTeste } from "./banco-teste";
import { consultar, definirConsulta } from "./banco";
import { limparTentativas, registrarFalha, tentativasEsgotadas } from "./tentativas";

beforeEach(async () => {
  definirConsulta(await criarBancoDeTeste());
});

describe("tentativas de login", () => {
  it("bloqueia só a chave que atingiu o limite", async () => {
    for (let i = 0; i < 5; i++) await registrarFalha("u:ana");
    expect(await tentativasEsgotadas("u:ana", 5)).toBe(true);
    expect(await tentativasEsgotadas("u:bia", 5)).toBe(false);
  });

  it("4 falhas ainda não bloqueiam, e limparTentativas zera", async () => {
    for (let i = 0; i < 4; i++) await registrarFalha("u:ana");
    expect(await tentativasEsgotadas("u:ana", 5)).toBe(false);
    await registrarFalha("u:ana");
    await limparTentativas("u:ana");
    expect(await tentativasEsgotadas("u:ana", 5)).toBe(false);
  });

  it("falhas de mais de 15 minutos atrás reiniciam a contagem", async () => {
    for (let i = 0; i < 5; i++) await registrarFalha("u:ana");
    await consultar("UPDATE tentativas_login SET desde = now() - interval '16 minutes'");
    expect(await tentativasEsgotadas("u:ana", 5)).toBe(false);
    await registrarFalha("u:ana");
    expect((await consultar<{ falhas: number }>("SELECT falhas FROM tentativas_login"))[0].falhas).toBe(1);
  });
});
