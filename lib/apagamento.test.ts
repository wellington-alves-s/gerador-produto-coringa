import { describe, it, expect, vi, afterEach } from "vitest";
import {
  aplicarApagamentos,
  carimboDaArea,
  carimboQuadrado,
  paraEspacoDaImagem,
  pontosAoLongo,
  poligonoDoCarimbo,
} from "./apagamento";
import type { Transformacao } from "./desenho";

const imagem = (sobrescrever: Partial<Transformacao> = {}): Transformacao => ({
  cx: 500,
  cy: 575,
  largura: 400,
  altura: 200,
  rotacao: 0,
  espelhoH: false,
  espelhoV: false,
  ...sobrescrever,
});

const perto = (a: number, b: number) => expect(a).toBeCloseTo(b, 3);

describe("paraEspacoDaImagem", () => {
  it("o centro da imagem é (0,5; 0,5) e os cantos são 0 e 1", () => {
    const t = imagem();
    expect(paraEspacoDaImagem(t, { x: 500, y: 575 })).toEqual({ x: 0.5, y: 0.5 });
    expect(paraEspacoDaImagem(t, { x: 300, y: 475 })).toEqual({ x: 0, y: 0 });
    expect(paraEspacoDaImagem(t, { x: 700, y: 675 })).toEqual({ x: 1, y: 1 });
  });

  it("com a imagem girada 90°, desfaz a rotação", () => {
    const t = imagem({ rotacao: 90 }); // o lado direito da imagem aponta para baixo no quadro
    const p = paraEspacoDaImagem(t, { x: 500, y: 575 + 200 }); // 200 abaixo do centro = metade da largura → borda direita
    perto(p.x, 1);
    perto(p.y, 0.5);
  });

  it("com espelhamento horizontal, o lado direito do quadro é o esquerdo da imagem", () => {
    const t = imagem({ espelhoH: true });
    const p = paraEspacoDaImagem(t, { x: 700, y: 575 });
    perto(p.x, 0);
    perto(p.y, 0.5);
  });

  it("com espelhamento vertical, inverte o eixo y", () => {
    const p = paraEspacoDaImagem(imagem({ espelhoV: true }), { x: 500, y: 475 });
    perto(p.x, 0.5);
    perto(p.y, 1);
  });
});

describe("carimbos", () => {
  it("a seleção de área vira um carimbo centrado, em frações da largura da imagem", () => {
    const c = carimboDaArea(imagem(), { x1: 400, y1: 500, x2: 600, y2: 600 });
    expect(c).toEqual({ u: 0.5, v: 0.375, mw: 0.25, mh: 0.125, rot: 0 });
  });

  it("aceita a seleção arrastada em qualquer direção", () => {
    expect(carimboDaArea(imagem(), { x1: 600, y1: 600, x2: 400, y2: 500 })).toEqual(carimboDaArea(imagem(), { x1: 400, y1: 500, x2: 600, y2: 600 }));
  });

  it("o quadrado da borracha tem meio-lado = lado/2 em frações da largura", () => {
    expect(carimboQuadrado(imagem(), { x: 500, y: 575 }, 40)).toMatchObject({ u: 0.5, v: 0.5, mw: 0.05, mh: 0.05 });
  });

  it("a rotação do carimbo compensa a da imagem (e inverte com um único espelhamento)", () => {
    expect(carimboQuadrado(imagem({ rotacao: 30 }), { x: 500, y: 575 }, 10).rot).toBe(-30);
    expect(carimboQuadrado(imagem({ rotacao: 30, espelhoH: true }), { x: 500, y: 575 }, 10).rot).toBe(30);
    expect(carimboQuadrado(imagem({ rotacao: 30, espelhoH: true, espelhoV: true }), { x: 500, y: 575 }, 10).rot).toBe(-30);
  });

  it("o carimbo continua válido se a imagem for redimensionada (é relativo)", () => {
    const antes = carimboDaArea(imagem(), { x1: 400, y1: 500, x2: 600, y2: 600 });
    const dobro = imagem({ largura: 800, altura: 400 });
    const depois = carimboDaArea(dobro, { x1: 300, y1: 425, x2: 700, y2: 625 }); // mesma área da imagem, ampliada
    expect(depois).toEqual(antes);
  });
});

describe("poligonoDoCarimbo", () => {
  it("sem rotação, são os quatro cantos do retângulo em pixels", () => {
    const poligono = poligonoDoCarimbo({ u: 0.5, v: 0.5, mw: 0.1, mh: 0.05, rot: 0 }, 1000, 500);
    expect(poligono).toEqual([
      { x: 400, y: 200 },
      { x: 600, y: 200 },
      { x: 600, y: 300 },
      { x: 400, y: 300 },
    ]);
  });

  it("girado 90°, largura e altura trocam de lugar", () => {
    const poligono = poligonoDoCarimbo({ u: 0.5, v: 0.5, mw: 0.1, mh: 0.05, rot: 90 }, 1000, 500);
    const xs = poligono.map((p) => Math.round(p.x));
    const ys = poligono.map((p) => Math.round(p.y));
    expect(Math.min(...xs)).toBe(450);
    expect(Math.max(...xs)).toBe(550);
    expect(Math.min(...ys)).toBe(150);
    expect(Math.max(...ys)).toBe(350);
  });
});

describe("pontosAoLongo", () => {
  it("preenche o segmento sem falhas e termina no destino", () => {
    const pontos = pontosAoLongo({ x: 0, y: 0 }, { x: 100, y: 0 }, 20);
    expect(pontos).toHaveLength(5);
    expect(pontos.at(-1)).toEqual({ x: 100, y: 0 });
    expect(pontos[0]).toEqual({ x: 20, y: 0 });
  });

  it("um movimento mínimo gera pelo menos um ponto", () => {
    expect(pontosAoLongo({ x: 5, y: 5 }, { x: 5, y: 5 }, 20)).toEqual([{ x: 5, y: 5 }]);
  });
});

describe("aplicarApagamentos", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("desenha a imagem, apaga cada carimbo com destination-out e devolve uma URL PNG", async () => {
    class ImagemFalsa {
      naturalWidth = 1000;
      naturalHeight = 500;
      width = 1000;
      height = 500;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_valor: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    }
    vi.stubGlobal("Image", ImagemFalsa);

    const caminho: string[] = [];
    const contexto = {
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      moveTo: (x: number, y: number) => caminho.push(`M${Math.round(x)},${Math.round(y)}`),
      lineTo: (x: number, y: number) => caminho.push(`L${Math.round(x)},${Math.round(y)}`),
      closePath: vi.fn(),
      fill: vi.fn(),
      globalCompositeOperation: "source-over",
      fillStyle: "",
    };
    const canvasFalso = {
      width: 0,
      height: 0,
      getContext: () => contexto,
      toDataURL: () => "data:image/png;base64,FALSO",
    };
    const criar = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) =>
      tag === "canvas" ? (canvasFalso as unknown as HTMLCanvasElement) : criar(tag)
    );

    const url = await aplicarApagamentos("/x.png", [{ u: 0.5, v: 0.5, mw: 0.1, mh: 0.05, rot: 0 }]);

    expect(url).toBe("data:image/png;base64,FALSO");
    expect(canvasFalso.width).toBe(1000);
    expect(canvasFalso.height).toBe(500);
    expect(contexto.drawImage).toHaveBeenCalledOnce();
    expect(contexto.globalCompositeOperation).toBe("destination-out");
    expect(caminho).toEqual(["M400,200", "L600,200", "L600,300", "L400,300"]);
    expect(contexto.fill).toHaveBeenCalledOnce();
  });
});
