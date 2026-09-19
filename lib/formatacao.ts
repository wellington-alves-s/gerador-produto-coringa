const CASAS_DECIMAIS_PADRAO = 3;
const CASAS_INTEIRAS_PADRAO = 1;

export const BUFFER_MEDIDA_INICIAL = "0000";

function tamanhoBuffer(casasDecimais: number, casasInteiras: number): number {
  return casasDecimais + casasInteiras;
}

export function bufferInicialMedida(
  casasDecimais: number = CASAS_DECIMAIS_PADRAO,
  casasInteiras: number = CASAS_INTEIRAS_PADRAO
): string {
  return "0".repeat(tamanhoBuffer(casasDecimais, casasInteiras));
}

export function atualizarBufferMedida(
  bufferAtual: string,
  valorBrutoDoInput: string,
  casasDecimais: number = CASAS_DECIMAIS_PADRAO,
  casasInteiras: number = CASAS_INTEIRAS_PADRAO
): string {
  const tamanho = tamanhoBuffer(casasDecimais, casasInteiras);
  const digitos = valorBrutoDoInput.replace(/\D/g, "");
  if (digitos.length === 0) return bufferInicialMedida(casasDecimais, casasInteiras);

  const apagando = digitos.length < bufferAtual.length;
  if (apagando) {
    return bufferAtual.slice(0, -1).padStart(tamanho, "0");
  }

  const novoDigito = digitos.slice(-1);
  return (bufferAtual + novoDigito).slice(-tamanho);
}

export function formatarBufferMedida(
  buffer: string,
  casasDecimais: number = CASAS_DECIMAIS_PADRAO,
  casasInteiras: number = CASAS_INTEIRAS_PADRAO
): string {
  const tamanho = tamanhoBuffer(casasDecimais, casasInteiras);
  const b = buffer.padStart(tamanho, "0").slice(-tamanho);
  return `${b.slice(0, -casasDecimais)},${b.slice(-casasDecimais)}`;
}

export function bufferMedidaParaMetros(buffer: string, casasDecimais: number = CASAS_DECIMAIS_PADRAO): number {
  return Number(buffer) / 10 ** casasDecimais;
}

/**
 * Mesmo valor de `formatarBufferMedida`, mas sem zeros à esquerda na parte
 * inteira (ex.: "05,0" vira "5,0"). Só para exibição — o campo de edição
 * precisa da largura fixa para o mecanismo de buffer funcionar.
 */
export function formatarMedidaParaExibicao(
  buffer: string,
  casasDecimais: number = CASAS_DECIMAIS_PADRAO,
  casasInteiras: number = CASAS_INTEIRAS_PADRAO
): string {
  const [parteInteira, parteDecimal] = formatarBufferMedida(buffer, casasDecimais, casasInteiras).split(",");
  return `${parteInteira.replace(/^0+(?=\d)/, "")},${parteDecimal}`;
}
