import { describe, it, expect } from "vitest";
import { campoEstaPreenchido, especificacoesValidas, campoObrigatorioAgora, camposFaltando } from "./validacao";
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

  describe("campos condicionais (dependeDe)", () => {
    const friso: Campo = {
      id: "friso",
      tipo: "opcao-unica",
      label: "Friso",
      opcoes: ["1 LADO", "2 LADOS"],
      dependeDe: { campoId: "tipoFolha", valores: ["FRISADA"] },
    };

    it("campoObrigatorioAgora é falso quando o campo do qual depende não tem o valor exigido", () => {
      expect(campoObrigatorioAgora(friso, { tipoFolha: "RASGADA" })).toBe(false);
      expect(campoObrigatorioAgora(friso, {})).toBe(false);
    });

    it("campoObrigatorioAgora é verdadeiro quando o campo do qual depende tem o valor exigido", () => {
      expect(campoObrigatorioAgora(friso, { tipoFolha: "FRISADA" })).toBe(true);
    });

    it("campoObrigatorioAgora considera múltiplas seleções separadas por |", () => {
      expect(campoObrigatorioAgora(friso, { tipoFolha: "RASGADA|FRISADA" })).toBe(true);
    });

    it("camposFaltando só lista o campo condicional quando a condição está ativa e ele está vazio", () => {
      expect(camposFaltando([friso], { tipoFolha: "RASGADA" })).toEqual([]);
      expect(camposFaltando([friso], { tipoFolha: "FRISADA" })).toEqual([friso]);
      expect(camposFaltando([friso], { tipoFolha: "FRISADA", friso: "2 LADOS" })).toEqual([]);
    });
  });
});
