export const CHAVE_RASCUNHO = "produto-coringa:rascunho";

/**
 * O rascunho em localStorage foi aposentado: o croqui é salvo na nuvem a cada "Próximo".
 * Esta função só apaga o que versões antigas deixaram no navegador (dados de cliente não devem
 * ficar esquecidos num computador compartilhado).
 */
export function limparRascunho(): void {
  try {
    window.localStorage.removeItem(CHAVE_RASCUNHO);
  } catch {
    // ignora
  }
}
