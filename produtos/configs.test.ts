import { describe, it, expect } from "vitest";
import { PRODUTOS } from "./index";

describe("configs de produto — conteúdo específico", () => {
  it("porta-marcenaria: madeira é opção fixa Imbuia/Cedro/Tauari", () => {
    const campo = PRODUTOS["porta-marcenaria"].campos.find((c) => c.id === "madeira");
    expect(campo?.tipo).toBe("opcao-unica");
    expect(campo && "opcoes" in campo ? campo.opcoes : []).toEqual(["IMBUIA", "CEDRO", "TAUARI"]);
  });

  it("porta-marcenaria: não tem campo de caixa de batente (é só folha)", () => {
    const ids = PRODUTOS["porta-marcenaria"].campos.map((c) => c.id);
    expect(ids).not.toContain("caixaBatente");
  });

  it("porta-especial: tem caixa de batente e padrão de madeira livre", () => {
    const ids = PRODUTOS["porta-especial"].campos.map((c) => c.id);
    expect(ids).toContain("caixaBatente");
    const padrao = PRODUTOS["porta-especial"].campos.find((c) => c.id === "padraoMadeira");
    expect(padrao?.tipo).toBe("texto");
  });

  it("porta-acm: prazo de entrega é 90 dias e tem campo de cor do ACM", () => {
    expect(PRODUTOS["porta-acm"].prazoEntregaDias).toBe(90);
    const ids = PRODUTOS["porta-acm"].campos.map((c) => c.id);
    expect(ids).toContain("corAcm");
    expect(ids).not.toContain("padraoMadeira");
  });

  it("esquadria: vidros tem as 3 opções do formulário físico", () => {
    const campo = PRODUTOS.esquadria.campos.find((c) => c.id === "vidros");
    expect(campo && "opcoes" in campo ? campo.opcoes : []).toEqual([
      "CONSIDERAR QUANTIDADE DE VIDROS DO DESENHO",
      "FAZER QUANTIDADE E TAMANHOS PROPORCIONAIS ÀS MEDIDAS DA PEÇA",
      "QUANTIDADES E TAMANHOS A CRITÉRIO DA FÁBRICA",
    ]);
  });

  it("degrau-patamar-rodape: só tem os 4 campos combinados, todos obrigatórios", () => {
    const campos = PRODUTOS["degrau-patamar-rodape"].campos;
    expect(campos).toHaveLength(4);
    expect(campos.every((c) => c.obrigatorio)).toBe(true);
  });

  it("outros: não tem nenhum campo estruturado", () => {
    expect(PRODUTOS.outros.campos).toHaveLength(0);
  });
});
