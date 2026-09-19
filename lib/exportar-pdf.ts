import { jsPDF } from "jspdf";
import { capturarDocumentoLargo } from "./captura-documento";

export async function exportarComoPdf(elemento: HTMLElement, nomeArquivo: string): Promise<void> {
  const canvas = await capturarDocumentoLargo(elemento);
  const pdf = new jsPDF("l", "mm", "a4");
  const larguraPdf = pdf.internal.pageSize.getWidth();
  const alturaPdf = pdf.internal.pageSize.getHeight();
  const razao = Math.min(larguraPdf / canvas.width, alturaPdf / canvas.height);
  const largura = canvas.width * razao;
  const altura = canvas.height * razao;
  const x = (larguraPdf - largura) / 2;
  const y = (alturaPdf - altura) / 2;

  const imagemDataUrl = canvas.toDataURL("image/png", 1.0);
  pdf.addImage(imagemDataUrl, "PNG", x, y, largura, altura);
  pdf.save(nomeArquivo);
}
