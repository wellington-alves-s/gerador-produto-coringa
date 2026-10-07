export function calcularDimensoesComprimidas(
  larguraOriginal: number,
  alturaOriginal: number,
  larguraMaxima: number
): { largura: number; altura: number } {
  if (larguraOriginal <= larguraMaxima) {
    return { largura: larguraOriginal, altura: alturaOriginal };
  }
  const fator = larguraMaxima / larguraOriginal;
  return { largura: larguraMaxima, altura: Math.round(alturaOriginal * fator) };
}

export type ImagemComprimida = { dataUrl: string; largura: number; altura: number };

/** Comprime para JPEG (com fundo branco no lugar de transparência) e devolve também as dimensões finais. */
export function comprimirImagemComDimensoes(
  arquivo: File,
  { larguraMaxima = 1600, qualidade = 0.8 }: { larguraMaxima?: number; qualidade?: number } = {}
): Promise<ImagemComprimida> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(leitor.error);
    leitor.onload = () => {
      const imagem = new Image();
      imagem.onerror = () => reject(new Error("Não foi possível carregar a imagem"));
      imagem.onload = () => {
        const { largura, altura } = calcularDimensoesComprimidas(imagem.width, imagem.height, larguraMaxima);
        const canvas = document.createElement("canvas");
        canvas.width = largura;
        canvas.height = altura;
        const contexto = canvas.getContext("2d");
        if (!contexto) {
          reject(new Error("Canvas 2D não disponível neste navegador"));
          return;
        }
        // JPEG não tem transparência: sem isto, partes transparentes de um PNG viravam preto.
        contexto.fillStyle = "#ffffff";
        contexto.fillRect(0, 0, largura, altura);
        contexto.drawImage(imagem, 0, 0, largura, altura);
        resolve({ dataUrl: canvas.toDataURL("image/jpeg", qualidade), largura, altura });
      };
      imagem.src = leitor.result as string;
    };
    leitor.readAsDataURL(arquivo);
  });
}

export async function comprimirImagem(
  arquivo: File,
  opcoes: { larguraMaxima?: number; qualidade?: number } = {}
): Promise<string> {
  return (await comprimirImagemComDimensoes(arquivo, opcoes)).dataUrl;
}
