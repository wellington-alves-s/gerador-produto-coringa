import html2canvas from "html2canvas";

export async function exportarComoImagem(elemento: HTMLElement, nomeArquivo: string): Promise<void> {
  const canvas = await html2canvas(elemento, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
  const link = document.createElement("a");
  link.download = nomeArquivo;
  link.href = canvas.toDataURL("image/png", 1.0);
  link.click();
}
