import { consultar } from "./banco";
import { ErroUsuarioExistente, ErroValidacao } from "./erros";
import { hashSenha } from "./senha";
import type { UsuarioSessao } from "./sessao";

export type Usuario = UsuarioSessao & { ativo: boolean; criadoEm: string; sessaoVersao: number };

type Linha = { id: number; usuario: string; nome: string; admin: boolean; ativo: boolean; criado_em: Date | string; sessao_versao: number; senha_hash?: string };

const COLUNAS = "id, usuario, nome, admin, ativo, criado_em, sessao_versao";
const TAMANHO_MINIMO_SENHA = 8;

function paraUsuario(l: Linha): Usuario {
  return {
    id: l.id,
    usuario: l.usuario,
    nome: l.nome,
    admin: l.admin,
    ativo: l.ativo,
    criadoEm: new Date(l.criado_em).toISOString(),
    sessaoVersao: l.sessao_versao,
  };
}

function validarSenha(senha: string): void {
  if (senha.length < TAMANHO_MINIMO_SENHA) {
    throw new ErroValidacao(`A senha precisa ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`);
  }
}

export async function criarUsuario(d: { usuario: string; nome: string; senha: string; admin?: boolean }): Promise<Usuario> {
  const usuario = d.usuario.trim().toLowerCase();
  const nome = d.nome.trim();
  if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) {
    throw new ErroValidacao("O usuário deve ter de 3 a 30 caracteres: letras, números, ponto, hífen ou sublinhado.");
  }
  if (!nome) throw new ErroValidacao("Informe o nome.");
  validarSenha(d.senha);
  try {
    const linhas = await consultar<Linha>(
      `INSERT INTO usuarios (usuario, nome, senha_hash, admin) VALUES ($1, $2, $3, $4) RETURNING ${COLUNAS}`,
      [usuario, nome, await hashSenha(d.senha), d.admin === true]
    );
    return paraUsuario(linhas[0]);
  } catch (erro) {
    if ((erro as { code?: string }).code === "23505") throw new ErroUsuarioExistente();
    throw erro;
  }
}

export async function buscarPorUsuario(usuario: string): Promise<(Usuario & { senhaHash: string }) | null> {
  const linhas = await consultar<Linha>(`SELECT ${COLUNAS}, senha_hash FROM usuarios WHERE usuario = $1`, [
    usuario.trim().toLowerCase(),
  ]);
  return linhas[0] ? { ...paraUsuario(linhas[0]), senhaHash: linhas[0].senha_hash! } : null;
}

export async function buscarPorId(id: number): Promise<Usuario | null> {
  const linhas = await consultar<Linha>(`SELECT ${COLUNAS} FROM usuarios WHERE id = $1`, [id]);
  return linhas[0] ? paraUsuario(linhas[0]) : null;
}

export async function listarUsuarios(): Promise<Usuario[]> {
  return (await consultar<Linha>(`SELECT ${COLUNAS} FROM usuarios ORDER BY nome, id`)).map(paraUsuario);
}

export async function trocarSenha(id: number, senha: string): Promise<void> {
  validarSenha(senha);
  // Trocar a senha também derruba as sessões abertas (sobe a versão).
  await consultar("UPDATE usuarios SET senha_hash = $2, sessao_versao = sessao_versao + 1 WHERE id = $1", [id, await hashSenha(senha)]);
}

export async function definirAtivo(id: number, ativo: boolean): Promise<void> {
  // Desativar sobe a versão: reativar depois não ressuscita os cookies antigos.
  await consultar("UPDATE usuarios SET ativo = $2, sessao_versao = sessao_versao + CASE WHEN $2::boolean THEN 0 ELSE 1 END WHERE id = $1", [id, ativo]);
}
