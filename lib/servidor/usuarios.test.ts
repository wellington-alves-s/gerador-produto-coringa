// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { criarBancoDeTeste } from "./banco-teste";
import { definirConsulta } from "./banco";
import { ErroUsuarioExistente, ErroValidacao } from "./erros";
import { conferirSenha } from "./senha";
import {
  buscarPorId,
  buscarPorUsuario,
  criarUsuario,
  definirAtivo,
  listarUsuarios,
  trocarSenha,
} from "./usuarios";

beforeEach(async () => {
  definirConsulta(await criarBancoDeTeste());
});

describe("usuarios", () => {
  it("normaliza o usuário (minúsculo, sem espaços nas pontas)", async () => {
    const u = await criarUsuario({ usuario: " Ana.Souza ", nome: "Ana Souza", senha: "senha-forte" });
    expect(u).toMatchObject({ usuario: "ana.souza", nome: "Ana Souza", admin: false, ativo: true });
  });

  it("rejeita senha curta, usuário inválido e nome vazio", async () => {
    await expect(criarUsuario({ usuario: "ana", nome: "Ana", senha: "1234567" })).rejects.toBeInstanceOf(ErroValidacao);
    await expect(criarUsuario({ usuario: "ana souza", nome: "Ana", senha: "senha-forte" })).rejects.toBeInstanceOf(
      ErroValidacao
    );
    await expect(criarUsuario({ usuario: "ab", nome: "Ana", senha: "senha-forte" })).rejects.toBeInstanceOf(ErroValidacao);
    await expect(criarUsuario({ usuario: "ana", nome: "  ", senha: "senha-forte" })).rejects.toBeInstanceOf(ErroValidacao);
  });

  it("usuário repetido (mesmo com outra caixa) vira ErroUsuarioExistente", async () => {
    await criarUsuario({ usuario: "ana", nome: "Ana", senha: "senha-forte" });
    await expect(criarUsuario({ usuario: "ANA", nome: "Outra", senha: "senha-forte" })).rejects.toBeInstanceOf(
      ErroUsuarioExistente
    );
  });

  it("a senha fica só em hash e buscarPorUsuario é case-insensitive", async () => {
    await criarUsuario({ usuario: "ana", nome: "Ana", senha: "senha-forte" });
    const achado = await buscarPorUsuario("ANA");
    expect(achado?.senhaHash).not.toContain("senha-forte");
    expect(await conferirSenha("senha-forte", achado!.senhaHash)).toBe(true);
    expect(await buscarPorUsuario("bia")).toBeNull();
  });

  it("definirAtivo, trocarSenha e listarUsuarios (sem hash)", async () => {
    const u = await criarUsuario({ usuario: "ana", nome: "Ana", senha: "senha-forte" });
    await definirAtivo(u.id, false);
    expect((await buscarPorId(u.id))?.ativo).toBe(false);
    await trocarSenha(u.id, "outra-senha-1");
    expect(await conferirSenha("outra-senha-1", (await buscarPorUsuario("ana"))!.senhaHash)).toBe(true);
    const lista = await listarUsuarios();
    expect(lista).toHaveLength(1);
    expect(JSON.stringify(lista)).not.toContain("scrypt");
    await expect(trocarSenha(u.id, "curta")).rejects.toBeInstanceOf(ErroValidacao);
  });
});

describe("usuarios — versão da sessão", () => {
  it("trocar a senha e desativar a conta sobem a versão; ativar não desce", async () => {
    const u = await criarUsuario({ usuario: "ana", nome: "Ana", senha: "senha-forte" });
    expect((await buscarPorId(u.id))?.sessaoVersao).toBe(0);
    await trocarSenha(u.id, "outra-senha-1");
    expect((await buscarPorId(u.id))?.sessaoVersao).toBe(1);
    await definirAtivo(u.id, false);
    expect((await buscarPorId(u.id))?.sessaoVersao).toBe(2);
    await definirAtivo(u.id, true);
    expect((await buscarPorId(u.id))?.sessaoVersao).toBe(2);
  });
});
