import { capturarDocumentoLargo } from "./captura-documento";

const LARGURA_IMAGEM_EXPORTADA = 3428;
const ALTURA_IMAGEM_EXPORTADA = 2480;

export async function exportarComoImagem(elemento: HTMLElement, nomeArquivo: string): Promise<void> {
  const canvas = await capturarDocumentoLargo(elemento, LARGURA_IMAGEM_EXPORTADA / ALTURA_IMAGEM_EXPORTADA);

  const canvasFinal = document.createElement("canvas");
  canvasFinal.width = LARGURA_IMAGEM_EXPORTADA;
  canvasFinal.height = ALTURA_IMAGEM_EXPORTADA;
  const contexto = canvasFinal.getContext("2d");
  if (!contexto) throw new Error("Canvas 2D não disponível neste navegador");

  contexto.fillStyle = "#ffffff";
  contexto.fillRect(0, 0, canvasFinal.width, canvasFinal.height);

  // "cover" (Math.max), não "contain" (Math.min): a largura da captura já é
  // ajustada em capturarDocumentoLargo pra ficar bem perto da proporção do
  // quadro, mas prever exatamente como o html2canvas vai desenhar o texto é
  // só uma aproximação — nunca é garantido bater 100%. Com "cover", qualquer
  // resíduo dessa aproximação vira um corte mínimo (poucos %) nas bordas,
  // em vez de sobrar tarja branca.
  const razao = Math.max(canvasFinal.width / canvas.width, canvasFinal.height / canvas.height);
  const largura = canvas.width * razao;
  const altura = canvas.height * razao;
  const x = (canvasFinal.width - largura) / 2;
  const y = (canvasFinal.height - altura) / 2;
  contexto.drawImage(canvas, x, y, largura, altura);

  const link = document.createElement("a");
  link.download = nomeArquivo;
  link.href = canvasFinal.toDataURL("image/png", 1.0);
  link.click();
}
