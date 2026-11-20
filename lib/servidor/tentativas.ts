import { consultar } from "./banco";

// Janela de 15 minutos: falhas mais antigas que isso não contam.
export async function tentativasEsgotadas(chave: string, limite: number): Promise<boolean> {
  const linhas = await consultar(
    "SELECT 1 FROM tentativas_login WHERE chave = $1 AND falhas >= $2 AND desde > now() - interval '15 minutes'",
    [chave, limite]
  );
  return linhas.length > 0;
}

export async function registrarFalha(chave: string): Promise<void> {
  await consultar(
    `INSERT INTO tentativas_login (chave, falhas, desde) VALUES ($1, 1, now())
     ON CONFLICT (chave) DO UPDATE SET
       falhas = CASE WHEN tentativas_login.desde < now() - interval '15 minutes' THEN 1 ELSE tentativas_login.falhas + 1 END,
       desde = CASE WHEN tentativas_login.desde < now() - interval '15 minutes' THEN now() ELSE tentativas_login.desde END`,
    [chave]
  );
}

export async function limparTentativas(chave: string): Promise<void> {
  await consultar("DELETE FROM tentativas_login WHERE chave = $1", [chave]);
}
