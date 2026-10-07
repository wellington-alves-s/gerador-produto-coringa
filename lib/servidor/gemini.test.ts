import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ErroGeracaoImagem, chaveConfigurada, extrairImagem, gerarImagemComGemini } from "./gemini";

const respostaOk = { candidates: [{ content: { parts: [{ text: "ok" }, { inlineData: { mimeType: "image/png", data: "QUJD" } }] } }] };

beforeEach(() => {
  vi.stubEnv("GEMINI_API_KEY", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("extrairImagem", () => {
  it("acha a parte com inlineData", () => {
    expect(extrairImagem(respostaOk)).toEqual({ mimeType: "image/png", base64: "QUJD" });
  });
  it("devolve null quando não há imagem", () => {
    expect(extrairImagem({ candidates: [{ content: { parts: [{ text: "recusei" }] } }] })).toBeNull();
    expect(extrairImagem({})).toBeNull();
  });
});

describe("gerarImagemComGemini", () => {
  it("sem chave configurada, falha com 503", async () => {
    expect(chaveConfigurada()).toBe(false);
    await expect(gerarImagemComGemini("p")).rejects.toMatchObject({ status: 503 });
  });

  it("envia prompt, referência e chave no cabeçalho e devolve a imagem", async () => {
    vi.stubEnv("GEMINI_API_KEY", "segredo");
    vi.stubEnv("GEMINI_IMAGE_MODEL", "modelo-x");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => respostaOk });
    vi.stubGlobal("fetch", fetchMock);

    const imagem = await gerarImagemComGemini("meu prompt", { mimeType: "image/jpeg", base64: "REF" });

    expect(imagem).toEqual({ mimeType: "image/png", base64: "QUJD" });
    const [url, opcoes] = fetchMock.mock.calls[0];
    expect(url).toContain("/modelo-x:generateContent");
    expect(url).not.toContain("segredo");
    expect(opcoes.headers["x-goog-api-key"]).toBe("segredo");
    const corpo = JSON.parse(opcoes.body);
    expect(corpo.contents[0].parts[0]).toEqual({ text: "meu prompt" });
    expect(corpo.contents[0].parts[1].inlineData).toEqual({ mimeType: "image/jpeg", data: "REF" });
  });

  it("traduz 429 e outros erros HTTP em mensagens amigáveis", async () => {
    vi.stubEnv("GEMINI_API_KEY", "segredo");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429 }));
    await expect(gerarImagemComGemini("p")).rejects.toMatchObject({ status: 429 });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(gerarImagemComGemini("p")).rejects.toBeInstanceOf(ErroGeracaoImagem);
  });

  it("falha quando a resposta não traz imagem", async () => {
    vi.stubEnv("GEMINI_API_KEY", "segredo");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ candidates: [] }) }));
    await expect(gerarImagemComGemini("p")).rejects.toMatchObject({ status: 502 });
  });
});
