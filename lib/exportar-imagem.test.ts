import { describe, it, expect, vi } from "vitest";
import { exportarComoImagem } from "./exportar-imagem";

vi.mock("html2canvas", () => ({
  default: vi.fn().mockResolvedValue({
    toDataURL: () => "data:image/png;base64,FALSO",
  }),
}));

describe("exportarComoImagem", () => {
  it("cria um link de download com a imagem gerada e clica nele", async () => {
    const elemento = document.createElement("div");
    const cliqueSimulado = vi.fn();
    const criarElementoOriginal = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "a") {
        const link = criarElementoOriginal("a");
        link.click = cliqueSimulado;
        return link;
      }
      return criarElementoOriginal(tag);
    });

    await exportarComoImagem(elemento, "croqui.png");

    expect(cliqueSimulado).toHaveBeenCalledOnce();
    vi.restoreAllMocks();
  });
});
