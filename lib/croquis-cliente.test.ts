import { describe, it, expect, vi, beforeEach } from "vitest";
import { ESTADO_INICIAL } from "./pedido";
import { ErroSalvamento, salvarCroquiNoServidor } from "./croquis-cliente";

const fetchMock = vi.fn();
const estado = { ...ESTADO_INICIAL, tipo: "esquadria" as const };

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("salvarCroquiNoServidor", () => {
  it("cria (sem id) e devolve o id recebido", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 7 }) });
    expect(await salvarCroquiNoServidor(estado)).toBe(7);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/croquis");
    const corpo = JSON.parse(init.body);
    expect(corpo.id).toBeUndefined();
    expect(corpo.estado.tipo).toBe("esquadria");
  });

  it("atualiza enviando o croquiId do estado", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 7 }) });
    await salvarCroquiNoServidor({ ...estado, croquiId: 7 });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).id).toBe(7);
  });

  it("413 vira aviso sobre imagens; 401 pede novo login; 404 e rede têm mensagem própria", async () => {
    const falhar = async (status: number) => {
      fetchMock.mockResolvedValue({ ok: false, status, json: async () => ({ erro: "x" }) });
      return salvarCroquiNoServidor(estado).catch((e) => e);
    };
    expect(await falhar(413)).toMatchObject({ status: 413, message: expect.stringMatching(/imagens/) });
    expect(await falhar(401)).toMatchObject({ status: 401, message: expect.stringMatching(/sessão expirou/) });
    expect(await falhar(404)).toBeInstanceOf(ErroSalvamento);
    fetchMock.mockRejectedValue(new Error("offline"));
    expect(await salvarCroquiNoServidor(estado).catch((e) => e)).toMatchObject({ status: 0 });
  });
});
