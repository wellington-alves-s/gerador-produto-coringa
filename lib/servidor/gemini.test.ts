import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ErroGeracaoImagem, chaveConfigurada, classificarErro, extrairImagem, gerarImagemComGemini } from "./gemini";

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

  it("traduz erros HTTP em mensagens amigáveis e registra o detalhe original nos logs, sem a chave", async () => {
    vi.stubEnv("GEMINI_API_KEY", "segredo");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const corpo = { error: { status: "RESOURCE_EXHAUSTED", message: "Quota exceeded ... limit: 0, model: x" } };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => corpo }));
    await expect(gerarImagemComGemini("p")).rejects.toMatchObject({ status: 429, message: expect.stringMatching(/sem cota/) });

    expect(log).toHaveBeenCalledOnce();
    expect(JSON.stringify(log.mock.calls[0])).toMatch(/limit: 0/);
    expect(JSON.stringify(log.mock.calls[0])).not.toMatch(/segredo/);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => { throw new Error("sem json"); } }));
    await expect(gerarImagemComGemini("p")).rejects.toBeInstanceOf(ErroGeracaoImagem);
    log.mockRestore();
  });

  it("falha quando a resposta não traz imagem", async () => {
    vi.stubEnv("GEMINI_API_KEY", "segredo");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ candidates: [] }) }));
    await expect(gerarImagemComGemini("p")).rejects.toMatchObject({ status: 502 });
  });
});

describe("classificarErro", () => {
  it("429 com limite 0 indica cota/faturamento; 429 comum indica esperar", () => {
    expect(classificarErro(429, "Quota exceeded for metric, limit: 0").message).toMatch(/sem cota/);
    expect(classificarErro(429, "check your plan and billing details").message).toMatch(/sem cota/);
    expect(classificarErro(429, "Resource has been exhausted (e.g. check quota).").message).toMatch(/Aguarde/);
  });
  it("404 indica modelo indisponível; 400/401/403 indicam chave/permissão", () => {
    expect(classificarErro(404, "").message).toMatch(/modelo/);
    expect(classificarErro(403, "").message).toMatch(/chave inválida/);
    expect(classificarErro(400, "API key not valid").status).toBe(502);
  });
  it("outros status viram erro genérico 502", () => {
    expect(classificarErro(500, "").status).toBe(502);
  });
});
