import { COOKIE_SESSAO, criarSessao, type UsuarioSessao } from "./sessao";

/** Só para testes: valor do cabeçalho `cookie` de uma sessão válida para o usuário. */
export async function cookieDeSessao(u: UsuarioSessao): Promise<string> {
  process.env.SESSAO_SEGREDO ??= "x".repeat(40);
  return `${COOKIE_SESSAO}=${await criarSessao(u)}`;
}
