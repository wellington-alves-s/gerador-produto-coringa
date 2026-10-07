/**
 * Ponto único de proteção da rota de geração de imagem.
 *
 * Hoje o acesso é livre (decisão da v1). Para bloquear no futuro, basta
 * implementar a regra aqui — a rota já chama `verificarAcesso` antes de
 * qualquer chamada paga:
 *
 *  - Limite por IP: usar `identificarCliente(requisicao)` como chave de um
 *    contador (ex.: Upstash/Vercel KV) e devolver `{ permitido: false, status: 429 }`.
 *  - Senha compartilhada: ler o cabeçalho `x-acesso-senha` (ou um cookie) e
 *    comparar com `process.env.GERAR_IMAGEM_SENHA`, devolvendo status 401.
 */
export type ResultadoAcesso = { permitido: true } | { permitido: false; status: number; mensagem: string };

export function identificarCliente(requisicao: Request): string {
  const encaminhado = requisicao.headers.get("x-forwarded-for");
  return encaminhado?.split(",")[0]?.trim() || requisicao.headers.get("x-real-ip") || "desconhecido";
}

export async function verificarAcesso(requisicao: Request): Promise<ResultadoAcesso> {
  void requisicao;
  return { permitido: true };
}
