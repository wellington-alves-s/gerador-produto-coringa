import { describe, it, expect } from "vitest";
import { identificarCliente, verificarAcesso } from "./protecao";

describe("protecao", () => {
  it("acesso livre por enquanto", async () => {
    expect(await verificarAcesso(new Request("http://localhost"))).toEqual({ permitido: true });
  });

  it("identifica o cliente pelo primeiro IP de x-forwarded-for", () => {
    const req = new Request("http://localhost", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    expect(identificarCliente(req)).toBe("1.2.3.4");
    expect(identificarCliente(new Request("http://localhost"))).toBe("desconhecido");
  });
});
