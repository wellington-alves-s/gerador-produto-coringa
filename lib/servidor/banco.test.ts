// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { criarBancoDeTeste } from "./banco-teste";
import { consultar, definirConsulta } from "./banco";

beforeEach(async () => {
  definirConsulta(await criarBancoDeTeste());
});

describe("banco (esquema)", () => {
  it("cria o esquema e devolve o id inserido", async () => {
    const linhas = await consultar("INSERT INTO usuarios (usuario, nome, senha_hash) VALUES ($1,$2,$3) RETURNING id", [
      "ana",
      "Ana",
      "x",
    ]);
    expect(linhas).toEqual([{ id: 1 }]);
  });

  it("não aceita usuário repetido", async () => {
    const inserir = () => consultar("INSERT INTO usuarios (usuario, nome, senha_hash) VALUES ('ana','Ana','x')");
    await inserir();
    await expect(inserir()).rejects.toThrow();
  });

  it("apagar um usuário apaga os croquis dele", async () => {
    await consultar("INSERT INTO usuarios (usuario, nome, senha_hash) VALUES ('ana','Ana','x')");
    await consultar("INSERT INTO croquis (usuario_id, tipo, estado) VALUES (1, 'esquadria', '{}'::jsonb)");
    await consultar("DELETE FROM usuarios WHERE id = 1");
    expect(await consultar("SELECT id FROM croquis")).toEqual([]);
  });

  it("consultar sem DATABASE_URL e sem injeção lança erro claro", async () => {
    definirConsulta(null);
    const original = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    await expect(consultar("SELECT 1")).rejects.toThrow(/DATABASE_URL/);
    if (original !== undefined) process.env.DATABASE_URL = original;
  });
});
