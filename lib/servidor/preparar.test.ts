// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { definirConsulta } from "./banco";
import { conferirSenha } from "./senha";
import { buscarPorUsuario } from "./usuarios";
import { prepararBanco } from "./preparar";

// Banco vazio, sem o esquema: é o prepararBanco que precisa criá-lo.
beforeEach(() => {
  const pg = new PGlite();
  definirConsulta(async <T>(texto: string, parametros: unknown[] = []) => (await pg.query<T>(texto, parametros)).rows);
});

const admin = { usuario: "chefe", senha: "senha-do-chefe", nome: "Chefe" };

describe("prepararBanco", () => {
  it("cria o esquema e a conta admin, que consegue entrar", async () => {
    expect(await prepararBanco(admin)).toEqual({ admin: "criado" });
    const conta = await buscarPorUsuario("chefe");
    expect(conta).toMatchObject({ admin: true, ativo: true });
    expect(await conferirSenha("senha-do-chefe", conta!.senhaHash)).toBe(true);
  });

  it("é idempotente: rodar de novo não cria outra conta nem troca a senha", async () => {
    await prepararBanco(admin);
    expect(await prepararBanco({ ...admin, usuario: "outro", senha: "outra-senha-123" })).toEqual({ admin: "ja-existia" });
    expect(await buscarPorUsuario("outro")).toBeNull();
    expect(await conferirSenha("senha-do-chefe", (await buscarPorUsuario("chefe"))!.senhaHash)).toBe(true);
  });

  it("sem credenciais só cria o esquema", async () => {
    expect(await prepararBanco()).toEqual({ admin: "nao-informado" });
    expect(await buscarPorUsuario("chefe")).toBeNull();
  });

  it("senha admin curta demais é recusada (e o esquema fica criado)", async () => {
    await expect(prepararBanco({ ...admin, senha: "curta" })).rejects.toThrow(/pelo menos 8/);
    expect(await prepararBanco(admin)).toEqual({ admin: "criado" });
  });
});
