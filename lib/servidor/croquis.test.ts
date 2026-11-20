// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { criarBancoDeTeste } from "./banco-teste";
import { consultar, definirConsulta } from "./banco";
import { ErroValidacao } from "./erros";
import { criarUsuario } from "./usuarios";
import type { UsuarioSessao } from "./sessao";
import { duplicarCroqui, excluirCroqui, listarCroquis, normalizarBusca, obterCroqui, salvarCroqui } from "./croquis";

let ana: UsuarioSessao;
let bia: UsuarioSessao;
let chefe: UsuarioSessao;

const estadoDe = (cliente: string, tipo = "esquadria") => ({
  tipo,
  pedido: { cliente, numeroPedido: "123", descricao: "" },
  especificacoes: {},
});

beforeEach(async () => {
  definirConsulta(await criarBancoDeTeste());
  const [a, b, c] = await Promise.all(
    ["ana", "bia", "chefe"].map((usuario) => criarUsuario({ usuario, nome: usuario, senha: "senha-forte-1", admin: usuario === "chefe" }))
  );
  [ana, bia, chefe] = [a, b, c];
});

describe("croquis", () => {
  it("normalizarBusca tira acento e caixa", () => {
    expect(normalizarBusca(" José ÁLVARES ")).toBe("jose alvares");
  });

  it("salva e atualiza o mesmo croqui (uma linha só)", async () => {
    const criado = await salvarCroqui(ana, { estado: estadoDe("José") });
    expect(criado).toEqual({ id: 1 });
    await consultar("UPDATE croquis SET atualizado_em = now() - interval '1 day'");
    const antes = (await consultar<{ atualizado_em: Date }>("SELECT atualizado_em FROM croquis"))[0].atualizado_em;
    expect(await salvarCroqui(ana, { id: 1, estado: estadoDe("José Álvares") })).toEqual({ id: 1 });
    const linhas = await consultar<{ cliente: string; cliente_busca: string; atualizado_em: Date }>(
      "SELECT cliente, cliente_busca, atualizado_em FROM croquis"
    );
    expect(linhas).toHaveLength(1);
    expect(linhas[0].cliente_busca).toBe("jose alvares");
    expect(linhas[0].atualizado_em.getTime()).toBeGreaterThan(antes.getTime());
  });

  it("outro vendedor não sobrescreve, lê nem exclui o croqui alheio", async () => {
    await salvarCroqui(ana, { estado: estadoDe("Cliente da Ana") });
    expect(await salvarCroqui(bia, { id: 1, estado: estadoDe("Invadido") })).toBeNull();
    expect(await obterCroqui(bia, 1)).toBeNull();
    expect(await excluirCroqui(bia, 1)).toBe(false);
    const [linha] = await consultar<{ cliente: string }>("SELECT cliente FROM croquis WHERE id = 1");
    expect(linha.cliente).toBe("Cliente da Ana");
  });

  it("o admin lê e exclui croquis de qualquer vendedor", async () => {
    await salvarCroqui(ana, { estado: estadoDe("Cliente da Ana") });
    expect(await obterCroqui(chefe, 1)).toMatchObject({ id: 1, usuarioId: ana.id });
    expect(await excluirCroqui(chefe, 1)).toBe(true);
    expect(await obterCroqui(ana, 1)).toBeNull();
  });

  it("obterCroqui devolve o estado salvo ao dono", async () => {
    await salvarCroqui(ana, { estado: estadoDe("Cliente da Ana") });
    const achado = await obterCroqui(ana, 1);
    expect(achado?.estado).toMatchObject({ tipo: "esquadria", pedido: { cliente: "Cliente da Ana" } });
  });

  it("vendedor lista só os seus, mesmo pedindo o vendedor de outro", async () => {
    await salvarCroqui(ana, { estado: estadoDe("Da Ana") });
    await salvarCroqui(bia, { estado: estadoDe("Da Bia") });
    const r = await listarCroquis(bia, { vendedorId: ana.id });
    expect(r.total).toBe(1);
    expect(r.itens.map((i) => i.cliente)).toEqual(["Da Bia"]);
  });

  it("admin lista todos e filtra por vendedor", async () => {
    await salvarCroqui(ana, { estado: estadoDe("Da Ana") });
    await salvarCroqui(bia, { estado: estadoDe("Da Bia") });
    expect((await listarCroquis(chefe, {})).total).toBe(2);
    const so = await listarCroquis(chefe, { vendedorId: ana.id });
    expect(so.itens.map((i) => [i.cliente, i.vendedor.nome])).toEqual([["Da Ana", "ana"]]);
  });

  it("busca por parte do nome, sem acento, e trata % e _ como texto", async () => {
    await salvarCroqui(ana, { estado: estadoDe("José Álvares") });
    await salvarCroqui(ana, { estado: estadoDe("Maria") });
    expect((await listarCroquis(ana, { busca: "jose" })).itens.map((i) => i.cliente)).toEqual(["José Álvares"]);
    expect((await listarCroquis(ana, { busca: "%" })).total).toBe(0);
  });

  it("pagina de 20 em 20, mais recentes primeiro", async () => {
    for (let i = 1; i <= 25; i++) await salvarCroqui(ana, { estado: estadoDe(`Cliente ${i}`) });
    const p1 = await listarCroquis(ana, { pagina: 1 });
    const p2 = await listarCroquis(ana, { pagina: 2 });
    expect([p1.itens.length, p2.itens.length, p1.total]).toEqual([20, 5, 25]);
    expect(p1.itens[0].cliente).toBe("Cliente 25");
  });

  it("rejeita tipo inexistente e estado maior que 4.000.000 bytes", async () => {
    await expect(salvarCroqui(ana, { estado: estadoDe("X", "inexistente") })).rejects.toBeInstanceOf(ErroValidacao);
    await expect(salvarCroqui(ana, { estado: "texto" })).rejects.toBeInstanceOf(ErroValidacao);
    const grande = { ...estadoDe("X"), lixo: "a".repeat(4_000_001) };
    await expect(salvarCroqui(ana, { estado: grande })).rejects.toMatchObject({ status: 413 });
  });
});

describe("duplicarCroqui", () => {
  const nomes = async (u: UsuarioSessao) => (await listarCroquis(u, {})).itens.map((i) => i.cliente).sort();

  it("cria uma cópia com o nome numerado, como cópia de arquivo, sem mexer no original", async () => {
    await salvarCroqui(ana, { estado: { ...estadoDe("VITOR ALBERTO DE TRENTIN - 12523"), especificacoes: { altura: "2100" }, croquiId: 1 } });
    const copia = await duplicarCroqui(ana, 1);
    expect(copia).toMatchObject({ cliente: "VITOR ALBERTO DE TRENTIN - 12523 (2)" });
    expect(await nomes(ana)).toEqual(["VITOR ALBERTO DE TRENTIN - 12523", "VITOR ALBERTO DE TRENTIN - 12523 (2)"]);

    const aberta = await obterCroqui(ana, copia!.id);
    expect(aberta?.estado).toMatchObject({
      tipo: "esquadria",
      especificacoes: { altura: "2100" },
      pedido: { cliente: "VITOR ALBERTO DE TRENTIN - 12523" + " (2)" },
      croquiId: null,
    });
    expect((await obterCroqui(ana, 1))?.estado).toMatchObject({ pedido: { cliente: "VITOR ALBERTO DE TRENTIN - 12523" } });
  });

  it("a numeração segue em frente: (2), (3), (4), mesmo duplicando uma cópia", async () => {
    await salvarCroqui(ana, { estado: estadoDe("Maria") });
    expect((await duplicarCroqui(ana, 1))?.cliente).toBe("Maria (2)");
    expect((await duplicarCroqui(ana, 1))?.cliente).toBe("Maria (3)");
    expect((await duplicarCroqui(ana, 2))?.cliente).toBe("Maria (4)");
  });

  it("não confunde nomes parecidos nem trata % e _ como curinga", async () => {
    await salvarCroqui(ana, { estado: estadoDe("Maria") });
    await salvarCroqui(ana, { estado: estadoDe("Maria Souza (7)") });
    await salvarCroqui(ana, { estado: estadoDe("100% (a)") });
    expect((await duplicarCroqui(ana, 1))?.cliente).toBe("Maria (2)");
    expect((await duplicarCroqui(ana, 3))?.cliente).toBe("100% (a) (2)");
  });

  it("croqui de outro vendedor: null (nada é criado)", async () => {
    await salvarCroqui(ana, { estado: estadoDe("Da Ana") });
    expect(await duplicarCroqui(bia, 1)).toBeNull();
    expect(await nomes(bia)).toEqual([]);
  });

  it("o admin duplica o croqui de um vendedor e a cópia fica na lista do admin", async () => {
    await salvarCroqui(ana, { estado: estadoDe("Da Ana") });
    const copia = await duplicarCroqui(chefe, 1);
    expect((await obterCroqui(chefe, copia!.id))?.usuarioId).toBe(chefe.id);
    expect(await nomes(ana)).toEqual(["Da Ana"]);
  });

  it("id inexistente: null", async () => {
    expect(await duplicarCroqui(ana, 999)).toBeNull();
  });
});
