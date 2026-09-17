import { describe, it, expect, vi } from "vitest";
import { exportarComoPdf } from "./exportar-pdf";

vi.mock("html2canvas", () => ({
  default: vi.fn().mockResolvedValue({
    width: 1000,
    height: 500,
    toDataURL: () => "data:image/png;base64,FALSO",
  }),
}));

const salvarMock = vi.fn();
const adicionarImagemMock = vi.fn();

vi.mock("jspdf", () => ({
  jsPDF: vi.fn(function () {
    return {
      internal: { pageSize: { getWidth: () => 297, getHeight: () => 210 } },
      addImage: adicionarImagemMock,
      save: salvarMock,
    };
  }),
}));

describe("exportarComoPdf", () => {
  it("gera o PDF com a imagem centralizada e salva com o nome informado", async () => {
    const elemento = document.createElement("div");
    await exportarComoPdf(elemento, "croqui.pdf");

    expect(adicionarImagemMock).toHaveBeenCalledWith(
      "data:image/png;base64,FALSO",
      "PNG",
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number)
    );
    expect(salvarMock).toHaveBeenCalledWith("croqui.pdf");
  });
});
