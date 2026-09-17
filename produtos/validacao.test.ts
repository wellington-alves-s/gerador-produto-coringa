import { describe, it, expect } from "vitest";
import { campoEstaPreenchido, especificacoesValidas } from "./validacao";
import type { Campo } from "./tipos";
import { BUFFER_MEDIDA_INICIAL } from "@/lib/formatacao";

describe("validação de especificações", () => {
  it("campo de medida com buffer 0000 não conta como preenchido", () => {
    const campo: Campo = { id: "altura", tipo: "medida", unidade: "m", label: "Altura", obrigatorio: true };
    expect(campoEstaPreenchido(campo, BUFFER_MEDIDA_INICIAL)).toBe(false);
    expect(campoEstaPreenchido(campo, "2100")).toBe(true);
  });

  it("campo de texto vazio ou só espaços não conta como preenchido", () => {
    const campo: Campo = { id: "padraoMadeira", tipo: "texto", label: "Padrão de madeira" };
    expect(campoEstaPreenchido(campo, "   ")).toBe(false);
    expect(campoEstaPreenchido(campo, "Tauari")).toBe(true);
  });

  it("especificacoesValidas ignora campos não obrigatórios", () => {
    const campos: Campo[] = [
      { id: "altura", tipo: "medida", unidade: "m", label: "Altura", obrigatorio: true },
      { id: "caixa", tipo: "medida", unidade: "m", label: "Caixa" },
    ];
    expect(especificacoesValidas(campos, { altura: "2100" })).toBe(true);
  });

  it("especificacoesValidas bloqueia quando falta um campo obrigatório", () => {
    const campos: Campo[] = [{ id: "altura", tipo: "medida", unidade: "m", label: "Altura", obrigatorio: true }];
    expect(especificacoesValidas(campos, {})).toBe(false);
  });
});
