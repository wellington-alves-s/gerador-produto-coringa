import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const TAMANHO_CHAVE = 64;

function derivar(senha: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolver, rejeitar) =>
    scrypt(senha, salt, TAMANHO_CHAVE, (erro, chave) => (erro ? rejeitar(erro) : resolver(chave)))
  );
}

export async function hashSenha(senha: string): Promise<string> {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("hex")}$${(await derivar(senha, salt)).toString("hex")}`;
}

export async function conferirSenha(senha: string, hash: string): Promise<boolean> {
  const [esquema, saltHex, chaveHex] = hash.split("$");
  if (esquema !== "scrypt" || !/^[0-9a-f]+$/.test(saltHex ?? "") || !/^[0-9a-f]+$/.test(chaveHex ?? "")) return false;
  const esperada = Buffer.from(chaveHex, "hex");
  if (esperada.length !== TAMANHO_CHAVE) return false;
  return timingSafeEqual(await derivar(senha, Buffer.from(saltHex, "hex")), esperada);
}
