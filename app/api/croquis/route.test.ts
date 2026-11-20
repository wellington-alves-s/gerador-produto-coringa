// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { criarBancoDeTeste } from "@/lib/servidor/banco-teste";
import { definirConsulta } from "@/lib/servidor/banco";
import { cookieDeSessao } from "@/lib/servidor/sessao-teste";
import { criarUsuario, definirAtivo } from "@/lib/servidor/usuarios";
import { GET as listar, POST as salvar } from "./route";
import { DELETE as excluir, GET as obter } from "./[id]/route";

let cookieAna = "";
let cookieBia = "";

const estado = (cliente: string) => ({ tipo: "esquadria", pedido: { cliente }, especificacoes: {} });
const post = (corpo: unknown, cookie: string | null = cookieAna) =>
  salvar(
    new Request("http://localhost/api/croquis", {
      method: "POST",
      headers: cookie ? { cookie } : {},
      body: typeof corpo === "string" ? corpo : JSON.stringify(corpo),
    })
  );
const comId = (id: number | string) => ({ params: Promise.resolve({ id: String(id) }) });
const req = (url: string, cookie: string | null = cookieAna, method = "GET") =>
  new Request(url, { method, headers: cookie ? { cookie } : {} });

beforeEach(async () => {
  definirConsulta(await criarBancoDeTeste());
  const ana = await criarUsuario({ usuario: "ana", nome: "Ana", senha: "senha-forte-1" });
  const bia = await criarUsuario({ usuario: "bia", nome: "Bia", senha: "senha-forte-1" });
  cookieAna = await cookieDeSessao(ana);
  cookieBia = await cookieDeSessao(bia);
});

describe("/api/croquis", () => {
  it("sem sessão: 401 em todas as rotas", async () => {
    expect((await post({ estado: estado("X") }, null)).status).toBe(401);
    expect((await listar(req("http://localhost/api/croquis", null))).status).toBe(401);
    expect((await obter(req("http://localhost/api/croquis/1", null), comId(1))).status).toBe(401);
    expect((await excluir(req("http://localhost/api/croquis/1", null, "DELETE"), comId(1))).status).toBe(401);
  });

  it("conta desativada com cookie válido: 401", async () => {
    await definirAtivo(1, false);
    expect((await post({ estado: estado("X") })).status).toBe(401);
  });

  it("salva, lista, abre e exclui o próprio croqui", async () => {
    const salvo = await post({ estado: estado("José Álvares") });
    expect(salvo.status).toBe(200);
    const { id } = await salvo.json();

    const lista = await (await listar(req("http://localhost/api/croquis?busca=jose"))).json();
    expect(lista.total).toBe(1);
    expect(lista.itens[0]).toMatchObject({ id, cliente: "José Álvares" });

    const aberto = await (await obter(req(`http://localhost/api/croquis/${id}`), comId(id))).json();
    expect(aberto.estado.pedido.cliente).toBe("José Álvares");

    expect((await excluir(req(`http://localhost/api/croquis/${id}`, cookieAna, "DELETE"), comId(id))).status).toBe(204);
    expect((await obter(req(`http://localhost/api/croquis/${id}`), comId(id))).status).toBe(404);
  });

  it("croqui de outro vendedor: 404 para abrir, sobrescrever e excluir", async () => {
    const { id } = await (await post({ estado: estado("Da Ana") })).json();
    expect((await obter(req(`http://localhost/api/croquis/${id}`, cookieBia), comId(id))).status).toBe(404);
    expect((await post({ id, estado: estado("Invadido") }, cookieBia)).status).toBe(404);
    expect((await excluir(req(`http://localhost/api/croquis/${id}`, cookieBia, "DELETE"), comId(id))).status).toBe(404);
    const aberto = await (await obter(req(`http://localhost/api/croquis/${id}`), comId(id))).json();
    expect(aberto.estado.pedido.cliente).toBe("Da Ana");
  });

  it("corpo inválido: 400; tipo inexistente: 400; id que não é número: 400", async () => {
    expect((await post("{")).status).toBe(400);
    expect((await post({ estado: { tipo: "inexistente" } })).status).toBe(400);
    expect((await post({ id: "abc", estado: estado("X") })).status).toBe(400);
  });

  it("corpo maior que 4.000.000 bytes: 413", async () => {
    const grande = { estado: { ...estado("X"), imagem: "a".repeat(4_000_001) } };
    expect((await post(grande)).status).toBe(413);
  });

  it("id da URL inválido: 404", async () => {
    expect((await obter(req("http://localhost/api/croquis/abc"), comId("abc"))).status).toBe(404);
  });
});
