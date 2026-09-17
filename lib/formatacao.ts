export const BUFFER_MEDIDA_INICIAL = "0000";

export function atualizarBufferMedida(bufferAtual: string, valorBrutoDoInput: string): string {
  const digitos = valorBrutoDoInput.replace(/\D/g, "");
  if (digitos.length === 0) return BUFFER_MEDIDA_INICIAL;

  const apagando = digitos.length < bufferAtual.length;
  if (apagando) {
    return bufferAtual.slice(0, -1).padStart(4, "0");
  }

  const novoDigito = digitos.slice(-1);
  return (bufferAtual + novoDigito).slice(-4);
}

export function formatarBufferMedida(buffer: string): string {
  const b = buffer.padStart(4, "0").slice(-4);
  return `${b.slice(0, -3)},${b.slice(-3)}`;
}

export function bufferMedidaParaMetros(buffer: string): number {
  return Number(buffer) / 1000;
}
