import { describe, it, expect } from "vitest";
import {
  atualizarBufferMedida,
  formatarBufferMedida,
  bufferMedidaParaMetros,
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
});
