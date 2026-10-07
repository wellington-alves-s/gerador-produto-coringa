import { describe, it, expect, vi } from "vitest";
import { capturarDocumentoLargo, FATOR_VIES_LARGURA } from "./captura-documento";

const html2canvasMock = vi.fn().mockResolvedValue({ width: 2000, height: 900 });
vi.mock("html2canvas", () => ({
  default: (...args: unknown[]) => html2canvasMock(...args),
}));

describe("capturarDocumentoLargo", () => {
  it("captura um clone fora da tela alargado, e remove o clone depois", async () => {
    const elemento = document.createElement("div");
    elemento.style.width = "672px";
    document.body.appendChild(elemento);

    const filhosAntes = document.body.children.length;
    await capturarDocumentoLargo(elemento);

    expect(html2canvasMock).toHaveBeenCalledOnce();
    const cloneCapturado = html2canvasMock.mock.calls[0][0] as HTMLElement;
    expect(cloneCapturado).not.toBe(elemento);
    expect(cloneCapturado.style.width).toBe("1400px");

    // o contêiner temporário criado para a captura já deve ter sido removido
    expect(document.body.children.length).toBe(filhosAntes);
  });

  it("troca as barras de título por um <svg> equivalente só no clone, preservando o texto", async () => {
    // jsdom não calcula layout de verdade — offsetWidth/offsetHeight simulam
    // as dimensões que a barra teria de fato num navegador real.
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, value: 300 });
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, value: 44 });

    const elemento = document.createElement("div");
    const barra = document.createElement("div");
    barra.dataset.barraExportacao = "titulo";
    barra.className = "flex h-11 items-center";
    barra.textContent = "ENCOMENDA ESPECIAL PORTAS";
    elemento.appendChild(barra);
    document.body.appendChild(elemento);

    try {
      await capturarDocumentoLargo(elemento);

      const cloneCapturado = html2canvasMock.mock.calls.at(-1)?.[0] as HTMLElement;
      expect(cloneCapturado.querySelector("[data-barra-exportacao]")).toBeNull();
      const svgNoClone = cloneCapturado.querySelector("svg");
      expect(svgNoClone?.querySelector("text")?.textContent).toBe("ENCOMENDA ESPECIAL PORTAS");
      expect(svgNoClone?.querySelector("rect")?.getAttribute("fill")).toBe("#991b1b");
      // display:block evita o espaço "fantasma" de elemento substituído
      // inline, que somava altura depois da proporção alvo já calculada.
      expect((svgNoClone as SVGElement | null)?.style.display).toBe("block");

      // o elemento original na página não deve ser alterado
      expect(elemento.querySelector("[data-barra-exportacao]")).toBe(barra);
    } finally {
      Reflect.deleteProperty(HTMLElement.prototype, "offsetWidth");
      Reflect.deleteProperty(HTMLElement.prototype, "offsetHeight");
    }
  });

  it("com razaoAlvo, estreita a largura da captura (aproximação por DOM) para casar com a proporção ajustada", async () => {
    // altura "medida" de 1000px; o código mira numa proporção levemente mais
    // estreita que a pedida (FATOR_VIES_LARGURA), pra compensar o viés
    // residual que o "cover" final corrigiria cortando a largura. A captura
    // de teste (scale 1) ecoa essa mesma proporção ajustada — sem divergir
    // do que o DOM mediu —, então a correção final não deve mexer no valor.
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, value: 1000 });
    const razaoAlvo = 3428 / 2480;
    const razaoAlvoAjustada = razaoAlvo * FATOR_VIES_LARGURA;

    html2canvasMock.mockImplementation(async (clone: unknown, opcoes: { scale: number }) => {
      if (opcoes.scale === 1) {
        const largura = parseInt((clone as HTMLElement).style.width);
        return { width: largura * razaoAlvoAjustada, height: largura };
      }
      return { width: 2000, height: 900 };
    });

    const elemento = document.createElement("div");
    document.body.appendChild(elemento);

    try {
      await capturarDocumentoLargo(elemento, razaoAlvo);

      const cloneCapturado = html2canvasMock.mock.calls.at(-1)?.[0] as HTMLElement;
      expect(cloneCapturado.style.width).toBe(`${Math.round(1000 * razaoAlvoAjustada)}px`);
    } finally {
      Reflect.deleteProperty(HTMLElement.prototype, "offsetHeight");
      html2canvasMock.mockReset();
      html2canvasMock.mockResolvedValue({ width: 2000, height: 900 });
    }
  });

  it("com razaoAlvo, itera a correção via capturas de teste reais (scale 1) até chegar mais perto da proporção pedida a cada rodada", async () => {
    // A aproximação por DOM não é garantia de bater com o que o html2canvas
    // desenha de verdade. Aqui a captura de teste simula um viés que o DOM
    // não prevê: uma altura extra fixa (VIES_ADITIVO), representando algo
    // como uma quebra de linha ou métrica de fonte que só aparece na
    // renderização real. Isso nunca fecha 100% numa única correção (o viés é
    // fixo, não proporcional), mas cada rodada de captura de teste deve
    // aproximar mais a proporção real da meta do que a rodada anterior.
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, value: 1000 });
    const razaoAlvo = 3428 / 2480;
    const razaoAlvoAjustada = razaoAlvo * FATOR_VIES_LARGURA;
    const VIES_ADITIVO = 60;

    // Registra a largura vista em cada chamada NO MOMENTO em que ela acontece
    // — o clone é o mesmo objeto mutado a cada rodada, então ler
    // `clone.style.width` de volta depois (via mock.calls) mostraria sempre
    // o valor final, não o valor daquele momento.
    const chamadasDeTeste: { scale: number; largura: number }[] = [];
    html2canvasMock.mockImplementation(async (clone: unknown, opcoes: { scale: number }) => {
      const largura = parseInt((clone as HTMLElement).style.width);
      chamadasDeTeste.push({ scale: opcoes.scale, largura });
      if (opcoes.scale === 1) return { width: largura, height: largura / razaoAlvoAjustada + VIES_ADITIVO };
      return { width: 2000, height: 900 };
    });

    const elemento = document.createElement("div");
    document.body.appendChild(elemento);

    try {
      await capturarDocumentoLargo(elemento, razaoAlvo);

      expect(chamadasDeTeste).toHaveLength(9);
      expect(chamadasDeTeste.at(-1)?.scale).toBe(2);

      const razoesMedidas = chamadasDeTeste
        .filter((c) => c.scale === 1)
        .map(({ largura }) => largura / (largura / razaoAlvoAjustada + VIES_ADITIVO));
      expect(razoesMedidas).toHaveLength(8);
      for (let i = 1; i < razoesMedidas.length; i++) {
        expect(Math.abs(razoesMedidas[i] - razaoAlvoAjustada)).toBeLessThanOrEqual(
          Math.abs(razoesMedidas[i - 1] - razaoAlvoAjustada)
        );
      }
      // e melhora de verdade entre a primeira e a última rodada, não só empata
      expect(Math.abs(razoesMedidas.at(-1)! - razaoAlvoAjustada)).toBeLessThan(
        Math.abs(razoesMedidas[0] - razaoAlvoAjustada)
      );
    } finally {
      Reflect.deleteProperty(HTMLElement.prototype, "offsetHeight");
      html2canvasMock.mockReset();
      html2canvasMock.mockResolvedValue({ width: 2000, height: 900 });
    }
  });

  it("troca o fundo do <html>/<body> por um hex durante a captura (html2canvas não lê oklch do tema escuro) e restaura depois", async () => {
    const fundosDuranteACaptura: string[] = [];
    html2canvasMock.mockImplementation(async () => {
      fundosDuranteACaptura.push(`${document.documentElement.style.backgroundColor}|${document.body.style.backgroundColor}`);
      return { width: 2000, height: 900 };
    });
    const elemento = document.createElement("div");
    document.body.appendChild(elemento);
    document.documentElement.classList.add("dark");
    document.body.style.backgroundColor = "rgb(1, 2, 3)";

    try {
      await capturarDocumentoLargo(elemento);
      expect(fundosDuranteACaptura).toEqual(["rgb(3, 7, 18)|rgb(3, 7, 18)"]); // #030712
      expect(document.body.style.backgroundColor).toBe("rgb(1, 2, 3)");
      expect(document.documentElement.style.backgroundColor).toBe("");

      document.documentElement.classList.remove("dark");
      fundosDuranteACaptura.length = 0;
      await capturarDocumentoLargo(elemento);
      expect(fundosDuranteACaptura).toEqual(["rgb(255, 255, 255)|rgb(255, 255, 255)"]);
    } finally {
      document.documentElement.classList.remove("dark");
      document.body.style.backgroundColor = "";
      html2canvasMock.mockReset();
      html2canvasMock.mockResolvedValue({ width: 2000, height: 900 });
    }
  });

  it("restaura o fundo mesmo quando a captura falha", async () => {
    html2canvasMock.mockRejectedValueOnce(new Error("falhou"));
    const elemento = document.createElement("div");
    document.body.appendChild(elemento);
    document.body.style.backgroundColor = "rgb(9, 9, 9)";
    try {
      await expect(capturarDocumentoLargo(elemento)).rejects.toThrow("falhou");
      expect(document.body.style.backgroundColor).toBe("rgb(9, 9, 9)");
    } finally {
      document.body.style.backgroundColor = "";
    }
  });
});
