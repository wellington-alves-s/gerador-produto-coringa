// Cria as tabelas e a conta admin inicial. Idempotente.
// Uso: npx tsx --env-file=.env.local scripts/preparar-banco.ts
// Lê DATABASE_URL e, opcionalmente, ADMIN_USUARIO / ADMIN_SENHA do ambiente.
import { prepararBanco } from "../lib/servidor/preparar";

const usuario = process.env.ADMIN_USUARIO?.trim();
const senha = process.env.ADMIN_SENHA;

const { admin } = await prepararBanco(usuario && senha ? { usuario, senha } : undefined);
console.log(
  {
    criado: `Esquema pronto e conta admin "${usuario}" criada.`,
    "ja-existia": "Esquema pronto. Já existe um admin; nada foi alterado.",
    "nao-informado": "Esquema pronto. Defina ADMIN_USUARIO e ADMIN_SENHA para criar o admin.",
  }[admin]
);
