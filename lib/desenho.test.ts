import { describe, it, expect } from "vitest";
import {
  ALTURA_DESENHO,
  HISTORICO_VAZIO,
  LARGURA_DESENHO,
  TAMANHO_MINIMO,
  arrastarExtremidadeDaLinha,
  atualizarTexto,
  caixaDoTexto,
  criarComTamanhoPadrao,
  criarImagem,
  criarLinha,
  criarRetangulo,
  criarTexto,
  deLocal,
  desfazer,
  duplicarElemento,
  espelharHorizontal,
  espelharVertical,
  extremidadesDaLinha,
  girarPor,
  moverPor,
  normalizarAngulo,
  paraLocal,
  refazer,
  redimensionarPorAlca,
  redimensionarTexto,
  registrarNoHistorico,
  removerElemento,
  reordenarCamada,
  rotacionarParaPonto,
  transformacaoPadraoDaImagem,
  type DesenhoEstado,
  type ElementoDesenho,
  type Transformacao,
} from "./desenho";

const caixa = (sobrescrever: Partial<Transformacao> = {}): Transformacao => ({
  cx: 300,
  cy: 200,
  largura: 200,
  altura: 100,
  rotacao: 0,
  espelhoH: false,
  espelhoV: false,
  ...sobrescrever,
});

const perto = (a: number, b: number) => expect(a).toBeCloseTo(b, 5);

describe("geometria básica", () => {
  it("paraLocal e deLocal são inversas, inclusive com rotação", () => {
    const t = caixa({ rotacao: 37 });
    const original = { x: 420, y: 255 };
    const volta = deLocal(t, paraLocal(t, original));
    perto(volta.x, original.x);
    perto(volta.y, original.y);
  });

  it("normaliza ângulos para (-180, 180]", () => {
    expect(normalizarAngulo(190)).toBe(-170);
    expect(normalizarAngulo(-190)).toBe(170);
    expect(normalizarAngulo(360)).toBe(0);
    expect(normalizarAngulo(180)).toBe(180);
  });
});

describe("mover, girar e espelhar", () => {
  it("moverPor desloca o centro e mantém dentro do quadro", () => {
    expect(moverPor(caixa(), 10, -5)).toMatchObject({ cx: 310, cy: 195 });
    expect(moverPor(caixa({ cx: 995 }), 50, 0).cx).toBe(LARGURA_DESENHO);
    expect(moverPor(caixa({ cy: 5 }), 0, -50).cy).toBe(0);
  });

  it("girarPor soma e normaliza", () => {
    expect(girarPor(caixa({ rotacao: 170 }), 20).rotacao).toBe(-170);
  });

  it("espelhar alterna cada eixo de forma independente", () => {
    const t = caixa();
    expect(espelharHorizontal(t)).toMatchObject({ espelhoH: true, espelhoV: false });
    expect(espelharVertical(espelharHorizontal(t))).toMatchObject({ espelhoH: true, espelhoV: true });
    expect(espelharHorizontal(espelharHorizontal(t)).espelhoH).toBe(false);
  });

  it("rotacionarParaPonto: ponteiro à direita do centro = 90°, abaixo = 180°, acima = 0°", () => {
    const t = caixa();
    expect(rotacionarParaPonto(t, { x: t.cx + 100, y: t.cy }).rotacao).toBeCloseTo(90);
    expect(rotacionarParaPonto(t, { x: t.cx, y: t.cy - 100 }).rotacao).toBeCloseTo(0);
    expect(rotacionarParaPonto(t, { x: t.cx, y: t.cy + 100 }).rotacao).toBeCloseTo(180);
  });

  it("rotacionarParaPonto com passo encaixa em múltiplos (ex.: 15°)", () => {
    const t = caixa();
    const ponto = { x: t.cx + 100, y: t.cy - 20 }; // ≈ 90 - 11,3 = 78,7°
    expect(rotacionarParaPonto(t, ponto, 15).rotacao).toBe(75);
  });
});

describe("redimensionarPorAlca", () => {
  it("arrastar a alça 'e' estica para a direita mantendo o lado esquerdo fixo", () => {
    const t = caixa(); // x de 200 a 400
    const novo = redimensionarPorAlca(t, "e", { x: 500, y: 999 });
    expect(novo.largura).toBe(300);
    expect(novo.altura).toBe(100);
    expect(novo.cx - novo.largura / 2).toBe(200);
  });

  it("alça de canto 'se' muda largura e altura e mantém o canto 'nw' fixo", () => {
    const t = caixa(); // nw = (200, 150)
    const novo = redimensionarPorAlca(t, "se", { x: 500, y: 350 });
    expect(novo).toMatchObject({ largura: 300, altura: 200 });
    perto(novo.cx - novo.largura / 2, 200);
    perto(novo.cy - novo.altura / 2, 150);
  });

  it("com rotação, o canto oposto continua fixo no mundo", () => {
    const t = caixa({ rotacao: 30 });
    const ancoraAntes = deLocal(t, { x: -t.largura / 2, y: -t.altura / 2 });
    const alvo = deLocal(t, { x: t.largura / 2 + 80, y: t.altura / 2 + 40 });
    const novo = redimensionarPorAlca(t, "se", alvo);
    const ancoraDepois = deLocal(novo, { x: -novo.largura / 2, y: -novo.altura / 2 });
    perto(ancoraDepois.x, ancoraAntes.x);
    perto(ancoraDepois.y, ancoraAntes.y);
    perto(novo.largura, 280);
    perto(novo.altura, 140);
  });

  it("proporcional mantém a razão largura/altura nas alças de canto", () => {
    const t = caixa(); // razão 2
    const novo = redimensionarPorAlca(t, "se", { x: 600, y: 260 }, { proporcional: true });
    perto(novo.largura / novo.altura, 2);
    expect(novo.largura).toBeGreaterThan(t.largura);
  });

  it("não deixa o tamanho cair abaixo do mínimo nem inverter", () => {
    const novo = redimensionarPorAlca(caixa(), "e", { x: 0, y: 0 });
    expect(novo.largura).toBe(TAMANHO_MINIMO);
  });
});

describe("linhas e setas", () => {
  it("criarLinha calcula centro, comprimento e ângulo; seta tem ponta no fim, seta dupla nas duas", () => {
    const l = criarLinha({ x: 100, y: 100 }, { x: 100, y: 300 }, "seta");
    expect(l).toMatchObject({ cx: 100, cy: 200, largura: 200, altura: 0, rotacao: 90, setaInicio: false, setaFim: true });
    expect(criarLinha({ x: 0, y: 0 }, { x: 10, y: 0 }, "seta-dupla")).toMatchObject({ setaInicio: true, setaFim: true });
    expect(criarLinha({ x: 0, y: 0 }, { x: 10, y: 0 })).toMatchObject({ setaInicio: false, setaFim: false });
  });

  it("extremidadesDaLinha devolve as pontas reais", () => {
    const l = criarLinha({ x: 100, y: 100 }, { x: 300, y: 100 });
    const { inicio, fim } = extremidadesDaLinha(l);
    perto(inicio.x, 100);
    perto(fim.x, 300);
    perto(inicio.y, 100);
  });

  it("arrastar a ponta final muda comprimento e ângulo, com o início fixo", () => {
    const l = criarLinha({ x: 100, y: 100 }, { x: 300, y: 100 });
    const nova = arrastarExtremidadeDaLinha(l, "fim", { x: 100, y: 400 });
    const { inicio, fim } = extremidadesDaLinha(nova);
    perto(inicio.x, 100);
    perto(inicio.y, 100);
    perto(fim.x, 100);
    perto(fim.y, 400);
    perto(nova.largura, 300);
  });

  it("arrastar a ponta inicial mantém o fim fixo", () => {
    const l = criarLinha({ x: 100, y: 100 }, { x: 300, y: 100 });
    const nova = arrastarExtremidadeDaLinha(l, "inicio", { x: 50, y: 150 });
    const { inicio, fim } = extremidadesDaLinha(nova);
    perto(fim.x, 300);
    perto(fim.y, 100);
    perto(inicio.x, 50);
    perto(inicio.y, 150);
  });
});

describe("texto", () => {
  it("a caixa cresce com o tamanho da fonte, o número de linhas e o negrito", () => {
    const base = caixaDoTexto("abc", 10, false);
    expect(caixaDoTexto("abc", 20, false).largura).toBeCloseTo(base.largura * 2);
    expect(caixaDoTexto("abc\nde", 10, false).altura).toBeCloseTo(base.altura * 2);
    expect(caixaDoTexto("abc", 10, true).largura).toBeGreaterThan(base.largura);
  });

  it("atualizarTexto recalcula a caixa", () => {
    const t = criarTexto({ x: 500, y: 400 }, "Oi");
    const maior = atualizarTexto(t, { texto: "Texto bem maior" });
    expect(maior.largura).toBeGreaterThan(t.largura);
    expect(atualizarTexto(t, { tamanhoFonte: 72 }).altura).toBeCloseTo(t.altura * 2);
  });

  it("redimensionarTexto pela alça de canto escala a fonte junto com a caixa", () => {
    const t = criarTexto({ x: 500, y: 400 }, "Texto");
    const alvo = { x: t.cx + t.largura / 2 + t.largura / 2, y: t.cy + t.altura / 2 + t.altura / 2 };
    const novo = redimensionarTexto(t, "se", alvo);
    expect(novo.largura).toBeCloseTo(t.largura * 1.5, 3);
    expect(novo.tamanhoFonte).toBeCloseTo(t.tamanhoFonte * 1.5, 3);
  });
});

describe("fábricas e duplicação", () => {
  it("criarRetangulo aceita cantos em qualquer ordem", () => {
    expect(criarRetangulo({ x: 300, y: 300 }, { x: 100, y: 200 })).toMatchObject({ cx: 200, cy: 250, largura: 200, altura: 100 });
  });

  it("criarComTamanhoPadrao gera formas utilizáveis a partir de um clique", () => {
    expect(criarComTamanhoPadrao("retangulo", { x: 500, y: 400 })).toMatchObject({ tipo: "retangulo", largura: 200, altura: 120 });
    expect(criarComTamanhoPadrao("seta", { x: 500, y: 400 })).toMatchObject({ tipo: "linha", largura: 200, setaFim: true });
  });

  it("duplicarElemento cria um id novo, deslocado, mantendo as propriedades", () => {
    const original = criarTexto({ x: 500, y: 400 }, "Medida");
    const copia = duplicarElemento({ ...original, rotacao: 20, cor: "#ff0000" });
    expect(copia.id).not.toBe(original.id);
    expect(copia).toMatchObject({ tipo: "texto", texto: "Medida", rotacao: 20, cor: "#ff0000", cx: 524, cy: 424 });
  });
});

describe("imagem do produto", () => {
  it("ajusta imagens largas e altas dentro do quadro mantendo a proporção", () => {
    const larga = transformacaoPadraoDaImagem(2);
    expect(larga.largura / larga.altura).toBeCloseTo(2);
    expect(larga.largura).toBeLessThanOrEqual(LARGURA_DESENHO);
    const alta = transformacaoPadraoDaImagem(0.5);
    expect(alta.largura / alta.altura).toBeCloseTo(0.5);
    expect(alta.altura).toBeLessThanOrEqual(ALTURA_DESENHO);
    expect(alta).toMatchObject({ cx: LARGURA_DESENHO / 2, cy: ALTURA_DESENHO / 2, rotacao: 0 });
  });

  it("o quadro cobre toda a moldura: o centro dos itens vai de 0 até a altura inteira", () => {
    expect(moverPor(caixa({ cy: 1000 }), 0, 300).cy).toBe(ALTURA_DESENHO);
    expect(moverPor(caixa({ cy: 100 }), 0, -300).cy).toBe(0);
  });
});

describe("camadas", () => {
  const a = criarTexto({ x: 1, y: 1 }, "a");
  const b = criarTexto({ x: 2, y: 2 }, "b");
  const c = criarTexto({ x: 3, y: 3 }, "c");
  const ordem = (lista: ElementoDesenho[]) => lista.map((e) => (e.tipo === "texto" ? e.texto : "?")).join("");

  it("frente/trás movem um nível; topo/fundo vão às pontas", () => {
    const lista = [a, b, c];
    expect(ordem(reordenarCamada(lista, a.id, "frente"))).toBe("bac");
    expect(ordem(reordenarCamada(lista, c.id, "tras"))).toBe("acb");
    expect(ordem(reordenarCamada(lista, a.id, "topo"))).toBe("bca");
    expect(ordem(reordenarCamada(lista, c.id, "fundo"))).toBe("cab");
  });

  it("nas pontas não faz nada e com id inexistente devolve a mesma lista", () => {
    const lista = [a, b, c];
    expect(ordem(reordenarCamada(lista, c.id, "frente"))).toBe("abc");
    expect(ordem(reordenarCamada(lista, a.id, "tras"))).toBe("abc");
    expect(reordenarCamada(lista, "nao-existe", "topo")).toBe(lista);
  });

  it("removerElemento tira só o escolhido", () => {
    expect(ordem(removerElemento([a, b, c], b.id))).toBe("ac");
  });
});

describe("histórico", () => {
  const d = (n: number): DesenhoEstado => ({ elementos: [], imagem: caixa({ cx: n }) });

  it("registrar → desfazer → refazer percorre os estados", () => {
    let h = registrarNoHistorico(HISTORICO_VAZIO, d(1));
    h = registrarNoHistorico(h, d(2));

    const desfeito = desfazer(h, d(3));
    expect(desfeito?.desenho).toEqual(d(2));
    const desfeito2 = desfazer(desfeito!.historico, desfeito!.desenho);
    expect(desfeito2?.desenho).toEqual(d(1));
    expect(desfazer(desfeito2!.historico, desfeito2!.desenho)).toBeNull();

    const refeito = refazer(desfeito2!.historico, desfeito2!.desenho);
    expect(refeito?.desenho).toEqual(d(2));
    const refeito2 = refazer(refeito!.historico, refeito!.desenho);
    expect(refeito2?.desenho).toEqual(d(3));
    expect(refazer(refeito2!.historico, refeito2!.desenho)).toBeNull();
  });

  it("uma nova ação depois de desfazer descarta o 'refazer'", () => {
    const h = registrarNoHistorico(HISTORICO_VAZIO, d(1));
    const desfeito = desfazer(h, d(2))!;
    expect(desfeito.historico.futuro).toHaveLength(1);
    expect(registrarNoHistorico(desfeito.historico, d(5)).futuro).toHaveLength(0);
  });

  it("limita o tamanho do histórico", () => {
    let h = HISTORICO_VAZIO;
    for (let i = 0; i < 150; i++) h = registrarNoHistorico(h, d(i));
    expect(h.passado).toHaveLength(100);
    expect(h.passado.at(-1)).toEqual(d(149));
  });
});

describe("imagem colada", () => {
  it("nasce com 400 de largura, na proporção original, no centro do quadro", () => {
    const i = criarImagem("data:image/png;base64,X", 2);
    expect(i).toMatchObject({ tipo: "imagem", src: "data:image/png;base64,X", largura: 400, altura: 200, cx: LARGURA_DESENHO / 2, cy: ALTURA_DESENHO / 2, rotacao: 0 });
  });

  it("limita a altura em 600 para imagens altas e aceita um centro", () => {
    const alta = criarImagem("x", 0.25, { x: 100, y: 200 });
    expect(alta).toMatchObject({ altura: 600, largura: 150, cx: 100, cy: 200 });
  });

  it("proporção inválida vira quadrada", () => {
    expect(criarImagem("x", 0)).toMatchObject({ largura: 400, altura: 400 });
  });
});
