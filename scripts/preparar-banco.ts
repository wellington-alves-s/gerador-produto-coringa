// Cria as tabelas e a conta admin inicial. Idempotente.
// Uso: npx tsx --env-file=.env.local scripts/preparar-banco.ts
// Lê DATABASE_URL e, opcionalmente, ADMIN_USUARIO / ADMIN_SENHA do ambiente.
import { prepararBanco } from "../lib/servidor/preparar";

const MENSAGENS = {
  criado: "Esquema pronto e conta admin criada.",
  "ja-existia": "Esquema pronto. Já existe um admin; nada foi alterado.",
  "nao-informado": "Esquema pronto. Defina ADMIN_USUARIO e ADMIN_SENHA para criar o admin.",
};

// Sem await no topo: o projeto não é ESM e o tsx compila este arquivo como CommonJS.
async function principal() {
  const usuario = process.env.ADMIN_USUARIO?.trim();
  const senha = process.env.ADMIN_SENHA;
  const { admin } = await prepararBanco(usuario && senha ? { usuario, senha } : undefined);
  console.log(MENSAGENS[admin]);
}

principal().catch((erro) => {
  console.error("Falhou:", erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
