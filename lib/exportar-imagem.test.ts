import { describe, it, expect, vi } from "vitest";
import { exportarComoImagem } from "./exportar-imagem";

vi.mock("html2canvas", () => ({
  default: vi.fn().mockResolvedValue({
    width: 1000,
    height: 2000,
    toDataURL: () => "data:image/png;base64,FALSO",
  }),
}));

describe("exportarComoImagem", () => {
  it("cria um link de download com a imagem gerada e clica nele", async () => {
    const elemento = document.createElement("div");
    const cliqueSimulado = vi.fn();
    const criarElementoOriginal = document.createElement.bind(document);
    const contextoFalso = { fillStyle: "", fillRect: vi.fn(), drawImage: vi.fn() };
    const canvasFalso = {
      width: 0,
      height: 0,
      getContext: () => contextoFalso,
      toDataURL: () => "data:image/png;base64,FALSO",
    };
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "a") {
        const link = criarElementoOriginal("a");
        link.click = cliqueSimulado;
        return link;
      }
      if (tag === "canvas") {
        return canvasFalso as unknown as HTMLCanvasElement;
      }
      return criarElementoOriginal(tag);
    });

    await exportarComoImagem(elemento, "croqui.png");

    expect(cliqueSimulado).toHaveBeenCalledOnce();
    vi.restoreAllMocks();
  });

  it("gera a imagem final sempre na resolução horizontal fixa 3428x2480", async () => {
    const elemento = document.createElement("div");
    const criarElementoOriginal = document.createElement.bind(document);
    const contextoFalso = { fillStyle: "", fillRect: vi.fn(), drawImage: vi.fn() };
    const canvasFalso = {
      width: 0,
      height: 0,
      getContext: () => contextoFalso,
      toDataURL: () => "data:image/png;base64,FALSO",
    };
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "a") {
        const link = criarElementoOriginal("a");
        link.click = vi.fn();
        return link;
      }
      if (tag === "canvas") {
        return canvasFalso as unknown as HTMLCanvasElement;
      }
      return criarElementoOriginal(tag);
    });

    await exportarComoImagem(elemento, "croqui.png");

    expect(canvasFalso.width).toBe(3428);
    expect(canvasFalso.height).toBe(2480);
    expect(contextoFalso.drawImage).toHaveBeenCalledOnce();
    vi.restoreAllMocks();
  });
});
