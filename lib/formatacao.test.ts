import { describe, it, expect } from "vitest";
import {
  atualizarBufferMedida,
  formatarBufferMedida,
  formatarMedidaParaExibicao,
  bufferMedidaParaMetros,
  bufferInicialMedida,
  BUFFER_MEDIDA_INICIAL,
} from "./formatacao";

describe("formatação de medida (padrão brasileiro)", () => {
  it("buffer inicial formata como 0,000", () => {
    expect(formatarBufferMedida(BUFFER_MEDIDA_INICIAL)).toBe("0,000");
  });

  it("digitar 9 uma vez produz 0,009", () => {
    // valorBrutoDoInput simula o valor completo do campo após a edição (o que o
    // navegador realmente entrega em onChange), não só o dígito novo isolado.
    const valorNoInput = formatarBufferMedida(BUFFER_MEDIDA_INICIAL) + "9";
    const buffer = atualizarBufferMedida(BUFFER_MEDIDA_INICIAL, valorNoInput);
    expect(formatarBufferMedida(buffer)).toBe("0,009");
  });

  it("digitar 2, 1, 0, 0 em sequência produz 2,100", () => {
    let buffer = BUFFER_MEDIDA_INICIAL;
    for (const digito of ["2", "1", "0", "0"]) {
      buffer = atualizarBufferMedida(buffer, formatarBufferMedida(buffer) + digito);
    }
    expect(formatarBufferMedida(buffer)).toBe("2,100");
  });

  it("apagar o último dígito visível volta uma casa", () => {
    // O buffer é só uma string de 4 dígitos — "2100" já representa 2,100 m
    // diretamente, sem precisar simular as 4 teclas que levariam até ele.
    let buffer = "2100";
    expect(formatarBufferMedida(buffer)).toBe("2,100");
    const valorAposApagar = formatarBufferMedida(buffer).slice(0, -1);
    buffer = atualizarBufferMedida(buffer, valorAposApagar);
    expect(formatarBufferMedida(buffer)).toBe("0,210");
  });

  it("campo vazio (tudo apagado) volta para 0,000", () => {
    const buffer = atualizarBufferMedida("2100", "");
    expect(formatarBufferMedida(buffer)).toBe("0,000");
  });

  it("converte buffer para metros", () => {
    expect(bufferMedidaParaMetros("2100")).toBe(2.1);
  });

  it("suporta casas decimais customizadas (ex: 2 casas para cm)", () => {
    let buffer = bufferInicialMedida(2);
    expect(formatarBufferMedida(buffer, 2)).toBe("0,00");

    for (const digito of ["1", "5", "0"]) {
      buffer = atualizarBufferMedida(buffer, formatarBufferMedida(buffer, 2) + digito, 2);
    }
    expect(formatarBufferMedida(buffer, 2)).toBe("1,50");
  });

  it("suporta casas inteiras customizadas (ex: 2 dígitos antes da vírgula, para medidas como 14,0 cm)", () => {
    let buffer = bufferInicialMedida(1, 2);
    expect(formatarBufferMedida(buffer, 1, 2)).toBe("00,0");

    for (const digito of ["1", "4", "0"]) {
      buffer = atualizarBufferMedida(buffer, formatarBufferMedida(buffer, 1, 2) + digito, 1, 2);
    }
    expect(formatarBufferMedida(buffer, 1, 2)).toBe("14,0");
  });

  it("formatarMedidaParaExibicao remove zero à esquerda da parte inteira (só na exibição)", () => {
    expect(formatarMedidaParaExibicao("050", 1, 2)).toBe("5,0");
    expect(formatarMedidaParaExibicao("140", 1, 2)).toBe("14,0");
    expect(formatarMedidaParaExibicao("000", 1, 2)).toBe("0,0");
  });

  it("formatarMedidaParaExibicao não altera o valor quando há só 1 casa inteira (padrão)", () => {
    expect(formatarMedidaParaExibicao("2100")).toBe("2,100");
    expect(formatarMedidaParaExibicao(BUFFER_MEDIDA_INICIAL)).toBe("0,000");
  });
});
