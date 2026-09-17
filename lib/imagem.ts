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

export function comprimirImagem(
  arquivo: File,
  { larguraMaxima = 1600, qualidade = 0.8 }: { larguraMaxima?: number; qualidade?: number } = {}
): Promise<string> {
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
        contexto.drawImage(imagem, 0, 0, largura, altura);
        resolve(canvas.toDataURL("image/jpeg", qualidade));
      };
      imagem.src = leitor.result as string;
    };
    leitor.readAsDataURL(arquivo);
  });
}
