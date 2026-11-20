// @vitest-environment node
import { describe, it, expect } from "vitest";
import { hashSenha, conferirSenha } from "./senha";

describe("senha", () => {
  it("gera hashes diferentes para a mesma senha (salt) e confere a senha certa", async () => {
    const a = await hashSenha("abc12345");
    const b = await hashSenha("abc12345");
    expect(a).not.toBe(b);
    expect(a.startsWith("scrypt$")).toBe(true);
    expect(await conferirSenha("abc12345", a)).toBe(true);
  });

  it("recusa senha errada e hash malformado", async () => {
    const hash = await hashSenha("abc12345");
    expect(await conferirSenha("abc12346", hash)).toBe(false);
    expect(await conferirSenha("abc12345", "lixo")).toBe(false);
    expect(await conferirSenha("abc12345", "scrypt$zz$zz")).toBe(false);
  });
});
