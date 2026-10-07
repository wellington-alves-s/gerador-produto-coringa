import { describe, it, expect, vi } from "vitest";
import { calcularDimensoesComprimidas, comprimirImagem } from "./imagem";

describe("calcularDimensoesComprimidas", () => {
  it("mantém as dimensões quando já está dentro do limite", () => {
    expect(calcularDimensoesComprimidas(800, 600, 1600)).toEqual({ largura: 800, altura: 600 });
  });

  it("reduz proporcionalmente quando ultrapassa a largura máxima", () => {
    expect(calcularDimensoesComprimidas(3200, 2400, 1600)).toEqual({ largura: 1600, altura: 1200 });
  });
});

describe("comprimirImagem", () => {
  it("retorna uma data URL JPEG usando as dimensões comprimidas", async () => {
    class ImagemFalsa {
      width = 3200;
      height = 2400;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_valor: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    }
    vi.stubGlobal("Image", ImagemFalsa);

    const contextoFalso = { drawImage: vi.fn(), fillRect: vi.fn(), fillStyle: "" };
    const canvasFalso = {
      width: 0,
      height: 0,
      getContext: () => contextoFalso,
      toDataURL: () => "data:image/jpeg;base64,FALSO",
    };
    vi.spyOn(document, "createElement").mockImplementation((tag: string) =>
      tag === "canvas" ? (canvasFalso as unknown as HTMLCanvasElement) : document.createElement(tag)
    );

    const arquivo = new File(["conteudo"], "foto.jpg", { type: "image/jpeg" });
    const resultado = await comprimirImagem(arquivo, { larguraMaxima: 1600 });

    expect(resultado).toBe("data:image/jpeg;base64,FALSO");
    expect(canvasFalso.width).toBe(1600);
    expect(canvasFalso.height).toBe(1200);

    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});
