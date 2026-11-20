import { consultar } from "./banco";
import { COMANDOS_ESQUEMA } from "./esquema";
import { criarUsuario } from "./usuarios";

/**
 * Cria as tabelas (idempotente) e, se ainda não existir nenhum admin, a conta admin informada.
 * Nunca altera a senha de uma conta existente.
 */
export async function prepararBanco(admin?: {
  usuario: string;
  senha: string;
  nome?: string;
}): Promise<{ admin: "criado" | "ja-existia" | "nao-informado" }> {
  for (const comando of COMANDOS_ESQUEMA) await consultar(comando);
  if (!admin) return { admin: "nao-informado" };

  const existentes = await consultar("SELECT 1 FROM usuarios WHERE admin = true LIMIT 1");
  if (existentes.length > 0) return { admin: "ja-existia" };

  await criarUsuario({ usuario: admin.usuario, nome: admin.nome ?? "Administrador", senha: admin.senha, admin: true });
  return { admin: "criado" };
}
