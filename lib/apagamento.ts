import { rotacionarPonto, type Ponto, type Transformacao } from "./desenho";

/**
 * Apagamentos da imagem do produto (seleção de área e borracha).
 *
 * Cada "carimbo" é um retângulo apagado, guardado em coordenadas RELATIVAS à imagem (0..1), então acompanha a
 * imagem quando ela é movida, girada, espelhada ou redimensionada. O original nunca é alterado: o resultado é
 * gerado em memória por `aplicarApagamentos` e os carimbos continuam salvos (e podem ser desfeitos).
 */
export type Carimbo = {
  /** Centro, em fração da largura/altura da imagem. */
  u: number;
  v: number;
  /** Meia-largura e meia-altura, em fração da LARGURA da imagem (a escala é uniforme). */
  mw: number;
  mh: number;
  /** Rotação do retângulo no espaço da imagem, em graus. */
  rot: number;
};

export type AreaSelecionada = { x1: number; y1: number; x2: number; y2: number };

// `|| 0` evita gravar -0 no rascunho.
const arredondar = (n: number) => Math.round(n * 10000) / 10000 || 0;

/** Ponto do quadro → coordenadas relativas à imagem (0..1), desfazendo rotação e espelhamento dela. */
export function paraEspacoDaImagem(t: Transformacao, ponto: Ponto): Ponto {
  let p = rotacionarPonto({ x: ponto.x - t.cx, y: ponto.y - t.cy }, -t.rotacao);
  if (t.espelhoH) p = { ...p, x: -p.x };
  if (t.espelhoV) p = { ...p, y: -p.y };
  return { x: p.x / t.largura + 0.5, y: p.y / t.altura + 0.5 };
}

/** Retângulo alinhado ao quadro (meiaLargura × meiaAltura em unidades do quadro) → carimbo na imagem. */
export function criarCarimbo(t: Transformacao, centro: Ponto, meiaLargura: number, meiaAltura: number): Carimbo {
  const c = paraEspacoDaImagem(t, centro);
  // Um espelhamento (só um dos dois) inverte o sentido do giro; dois espelhamentos equivalem a 180°, que
  // um retângulo ignora.
  const rot = t.espelhoH !== t.espelhoV ? t.rotacao : -t.rotacao;
  return {
    u: arredondar(c.x),
    v: arredondar(c.y),
    mw: arredondar(meiaLargura / t.largura),
    mh: arredondar(meiaAltura / t.largura),
    rot: arredondar(rot),
  };
}

export function carimboDaArea(t: Transformacao, area: AreaSelecionada): Carimbo {
  return criarCarimbo(
    t,
    { x: (area.x1 + area.x2) / 2, y: (area.y1 + area.y2) / 2 },
    Math.abs(area.x2 - area.x1) / 2,
    Math.abs(area.y2 - area.y1) / 2
  );
}

export function carimboQuadrado(t: Transformacao, centro: Ponto, lado: number): Carimbo {
  return criarCarimbo(t, centro, lado / 2, lado / 2);
}

/** Centros dos carimbos ao longo do segmento a→b (inclui b), espaçados de `passo` — sem falhas no traço. */
export function pontosAoLongo(a: Ponto, b: Ponto, passo: number): Ponto[] {
  const distancia = Math.hypot(b.x - a.x, b.y - a.y);
  const quantidade = Math.max(1, Math.ceil(distancia / Math.max(1, passo)));
  return Array.from({ length: quantidade }, (_, i) => {
    const fracao = (i + 1) / quantidade;
    return { x: a.x + (b.x - a.x) * fracao, y: a.y + (b.y - a.y) * fracao };
  });
}

/** Cantos do carimbo em pixels da imagem de tamanho largura × altura. */
export function poligonoDoCarimbo(c: Carimbo, largura: number, altura: number): Ponto[] {
  const metadeX = c.mw * largura;
  const metadeY = c.mh * largura;
  return [
    [-metadeX, -metadeY],
    [metadeX, -metadeY],
    [metadeX, metadeY],
    [-metadeX, metadeY],
  ].map(([x, y]) => {
    const girado = rotacionarPonto({ x, y }, c.rot);
    return { x: c.u * largura + girado.x, y: c.v * altura + girado.y };
  });
}

// ---------- processamento da imagem (canvas) ----------

const imagensCarregadas = new Map<string, Promise<HTMLImageElement>>();

function carregarImagem(src: string): Promise<HTMLImageElement> {
  let promessa = imagensCarregadas.get(src);
  if (!promessa) {
    promessa = new Promise((resolve, reject) => {
      const imagem = new Image();
      imagem.onload = () => resolve(imagem);
      imagem.onerror = () => {
        imagensCarregadas.delete(src);
        reject(new Error("Não foi possível carregar a imagem"));
      };
      imagem.src = src;
    });
    imagensCarregadas.set(src, promessa);
  }
  return promessa;
}

function canvasParaUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve) => {
    if (typeof canvas.toBlob === "function" && typeof URL.createObjectURL === "function") {
      canvas.toBlob((blob) => resolve(blob ? URL.createObjectURL(blob) : canvas.toDataURL("image/png")), "image/png");
    } else {
      resolve(canvas.toDataURL("image/png"));
    }
  });
}

/** Devolve uma URL (PNG com transparência) da imagem com os carimbos apagados. A original não é tocada. */
export async function aplicarApagamentos(src: string, carimbos: Carimbo[]): Promise<string> {
  const imagem = await carregarImagem(src);
  const canvas = document.createElement("canvas");
  canvas.width = imagem.naturalWidth || imagem.width;
  canvas.height = imagem.naturalHeight || imagem.height;
  const contexto = canvas.getContext("2d");
  if (!contexto) throw new Error("Canvas 2D não disponível neste navegador");

  contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height);
  contexto.globalCompositeOperation = "destination-out";
  contexto.fillStyle = "#000000";
  for (const carimbo of carimbos) {
    const [primeiro, ...demais] = poligonoDoCarimbo(carimbo, canvas.width, canvas.height);
    contexto.beginPath();
    contexto.moveTo(primeiro.x, primeiro.y);
    for (const ponto of demais) contexto.lineTo(ponto.x, ponto.y);
    contexto.closePath();
    contexto.fill();
  }
  return canvasParaUrl(canvas);
}
