/** Um comando SQL por item (o driver HTTP da Neon não executa vários de uma vez). Todos idempotentes. */
export const COMANDOS_ESQUEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    usuario TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    senha_hash TEXT NOT NULL,
    admin BOOLEAN NOT NULL DEFAULT false,
    ativo BOOLEAN NOT NULL DEFAULT true,
    -- sobe ao trocar a senha ou desativar a conta: invalida as sessões (cookies) já emitidas
    sessao_versao INT NOT NULL DEFAULT 0,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS croquis (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    cliente TEXT NOT NULL DEFAULT '',
    cliente_busca TEXT NOT NULL DEFAULT '',
    numero_pedido TEXT NOT NULL DEFAULT '',
    tipo TEXT NOT NULL,
    estado JSONB NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS croquis_usuario_atualizado ON croquis (usuario_id, atualizado_em DESC)`,
  `CREATE TABLE IF NOT EXISTS configuracoes (chave TEXT PRIMARY KEY, valor JSONB NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS tentativas_login (
    chave TEXT PRIMARY KEY,
    falhas INT NOT NULL,
    desde TIMESTAMPTZ NOT NULL
  )`,
];
