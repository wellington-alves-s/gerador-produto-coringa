/**
 * Modelo e matemática do desenho editável (anotações sobre a imagem do croqui).
 *
 * Todas as coordenadas ficam num espaço lógico fixo (LARGURA_DESENHO × ALTURA_DESENHO):
 * assim o desenho escala por igual na tela, no preview e nas exportações.
 * Cada elemento é definido pelo centro (cx, cy), tamanho e rotação em graus (em torno do centro).
 */

export const LARGURA_DESENHO = 1000;
/**
 * Proporção fixa do quadro (a própria moldura do "Desenho da peça especial"). Fixa para que a tela de
 * Revisão e o arquivo exportado fiquem idênticos; ~0,87 é a proporção que a moldura já tinha no PDF.
 */
export const ALTURA_DESENHO = 1150;
export const TAMANHO_MINIMO = 6;

export type Ponto = { x: number; y: number };

export type Transformacao = {
  cx: number;
  cy: number;
  largura: number;
  altura: number;
  rotacao: number;
  espelhoH: boolean;
  espelhoV: boolean;
};

type ElementoBase = Transformacao & { id: string };

/** Linha/seta: segmento ao longo do eixo local x (altura é sempre 0). */
export type ElementoLinha = ElementoBase & {
  tipo: "linha";
  cor: string;
  espessura: number;
  setaInicio: boolean;
  setaFim: boolean;
};

export type ElementoTexto = ElementoBase & {
  tipo: "texto";
  texto: string;
  tamanhoFonte: number;
  cor: string;
  negrito: boolean;
};

export type ElementoRetangulo = ElementoBase & {
  tipo: "retangulo";
  cor: string;
  espessura: number;
  preenchimento: string | null;
};

export type ElementoDesenho = ElementoLinha | ElementoTexto | ElementoRetangulo;

export type DesenhoEstado = {
  elementos: ElementoDesenho[];
  /** Posição da imagem do produto; null = ajustada automaticamente ao quadro. */
  imagem: Transformacao | null;
};

export const DESENHO_INICIAL: DesenhoEstado = { elementos: [], imagem: null };

export const COR_PADRAO = "#000000";

// ---------- geometria ----------

const paraRadianos = (graus: number) => (graus * Math.PI) / 180;

export function rotacionarPonto(ponto: Ponto, graus: number): Ponto {
  const r = paraRadianos(graus);
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return { x: ponto.x * cos - ponto.y * sin, y: ponto.x * sin + ponto.y * cos };
}

/** Ponto global → coordenadas locais do elemento (origem no centro, eixos girados com ele). */
export function paraLocal(t: Transformacao, ponto: Ponto): Ponto {
  return rotacionarPonto({ x: ponto.x - t.cx, y: ponto.y - t.cy }, -t.rotacao);
}

export function deLocal(t: Transformacao, local: Ponto): Ponto {
  const girado = rotacionarPonto(local, t.rotacao);
  return { x: t.cx + girado.x, y: t.cy + girado.y };
}

export function normalizarAngulo(graus: number): number {
  let a = ((graus % 360) + 360) % 360;
  if (a > 180) a -= 360;
  return a;
}

// ---------- ids e fábricas ----------

export function novoId(): string {
  return `el-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const SEM_TRANSFORMACAO = { rotacao: 0, espelhoH: false, espelhoV: false };

export function linhaEntre(inicio: Ponto, fim: Ponto): Pick<ElementoLinha, "cx" | "cy" | "largura" | "altura" | "rotacao"> {
  const dx = fim.x - inicio.x;
  const dy = fim.y - inicio.y;
  return {
    cx: (inicio.x + fim.x) / 2,
    cy: (inicio.y + fim.y) / 2,
    largura: Math.hypot(dx, dy),
    altura: 0,
    rotacao: normalizarAngulo((Math.atan2(dy, dx) * 180) / Math.PI),
  };
}

export type TipoLinha = "linha" | "seta" | "seta-dupla";

export function criarLinha(inicio: Ponto, fim: Ponto, variante: TipoLinha = "linha"): ElementoLinha {
  return {
    id: novoId(),
    tipo: "linha",
    ...SEM_TRANSFORMACAO,
    ...linhaEntre(inicio, fim),
    cor: COR_PADRAO,
    espessura: 4,
    setaInicio: variante === "seta-dupla",
    setaFim: variante !== "linha",
  };
}

const FATOR_LARGURA_CARACTERE = 0.58;
const FATOR_LARGURA_NEGRITO = 0.64;
const FATOR_ALTURA_LINHA = 1.25;

/** Caixa estimada do texto; linear no tamanho da fonte, para que redimensionar = escalar a fonte. */
export function caixaDoTexto(texto: string, tamanhoFonte: number, negrito: boolean) {
  const linhas = texto.split("\n");
  const maiorLinha = Math.max(1, ...linhas.map((linha) => linha.length));
  const fator = negrito ? FATOR_LARGURA_NEGRITO : FATOR_LARGURA_CARACTERE;
  return { largura: maiorLinha * tamanhoFonte * fator, altura: linhas.length * tamanhoFonte * FATOR_ALTURA_LINHA };
}

export function criarTexto(ponto: Ponto, texto = "Texto"): ElementoTexto {
  const tamanhoFonte = 36;
  return {
    id: novoId(),
    tipo: "texto",
    ...SEM_TRANSFORMACAO,
    cx: ponto.x,
    cy: ponto.y,
    texto,
    tamanhoFonte,
    cor: COR_PADRAO,
    negrito: true,
    ...caixaDoTexto(texto, tamanhoFonte, true),
  };
}

export function retanguloEntre(a: Ponto, b: Ponto): Pick<ElementoRetangulo, "cx" | "cy" | "largura" | "altura"> {
  return {
    cx: (a.x + b.x) / 2,
    cy: (a.y + b.y) / 2,
    largura: Math.abs(b.x - a.x),
    altura: Math.abs(b.y - a.y),
  };
}

export function criarRetangulo(a: Ponto, b: Ponto): ElementoRetangulo {
  return {
    id: novoId(),
    tipo: "retangulo",
    ...SEM_TRANSFORMACAO,
    ...retanguloEntre(a, b),
    cor: COR_PADRAO,
    espessura: 4,
    preenchimento: null,
  };
}

/** Tamanho padrão quando o usuário só clica (sem arrastar) com a ferramenta de forma. */
export function criarComTamanhoPadrao(variante: TipoLinha | "retangulo", ponto: Ponto): ElementoDesenho {
  if (variante === "retangulo") {
    return criarRetangulo({ x: ponto.x - 100, y: ponto.y - 60 }, { x: ponto.x + 100, y: ponto.y + 60 });
  }
  return criarLinha({ x: ponto.x - 100, y: ponto.y }, { x: ponto.x + 100, y: ponto.y }, variante);
}

// ---------- operações sobre um elemento (ou a imagem) ----------

export function limitarCentro<T extends Transformacao>(t: T): T {
  return {
    ...t,
    cx: Math.min(LARGURA_DESENHO, Math.max(0, t.cx)),
    cy: Math.min(ALTURA_DESENHO, Math.max(0, t.cy)),
  };
}

export function moverPor<T extends Transformacao>(t: T, dx: number, dy: number): T {
  return limitarCentro({ ...t, cx: t.cx + dx, cy: t.cy + dy });
}

export function espelharHorizontal<T extends Transformacao>(t: T): T {
  return { ...t, espelhoH: !t.espelhoH };
}

export function espelharVertical<T extends Transformacao>(t: T): T {
  return { ...t, espelhoV: !t.espelhoV };
}

export function girarPor<T extends Transformacao>(t: T, graus: number): T {
  return { ...t, rotacao: normalizarAngulo(t.rotacao + graus) };
}

/** Rotação para que a alça de rotação (acima do elemento) aponte para o ponteiro. */
export function rotacionarParaPonto<T extends Transformacao>(t: T, ponto: Ponto, passo?: number): T {
  let angulo = (Math.atan2(ponto.y - t.cy, ponto.x - t.cx) * 180) / Math.PI + 90;
  if (passo) angulo = Math.round(angulo / passo) * passo;
  return { ...t, rotacao: normalizarAngulo(angulo) };
}

export type Alca = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export const DIRECAO_ALCA: Record<Alca, [number, number]> = {
  nw: [-1, -1],
  n: [0, -1],
  ne: [1, -1],
  e: [1, 0],
  se: [1, 1],
  s: [0, 1],
  sw: [-1, 1],
  w: [-1, 0],
};

/** Arrasta uma alça de redimensionamento; o lado oposto fica fixo (mesmo com o elemento girado). */
export function redimensionarPorAlca<T extends Transformacao>(
  t: T,
  alca: Alca,
  ponto: Ponto,
  opcoes: { proporcional?: boolean } = {}
): T {
  const [hx, hy] = DIRECAO_ALCA[alca];
  const p = paraLocal(t, ponto);
  const ancoraX = (-hx * t.largura) / 2;
  const ancoraY = (-hy * t.altura) / 2;

  let largura = hx !== 0 ? Math.max(TAMANHO_MINIMO, (p.x - ancoraX) * hx) : t.largura;
  let altura = hy !== 0 ? Math.max(TAMANHO_MINIMO, (p.y - ancoraY) * hy) : t.altura;

  if (opcoes.proporcional && hx !== 0 && hy !== 0 && t.largura > 0 && t.altura > 0) {
    const escala = Math.max(largura / t.largura, altura / t.altura);
    largura = t.largura * escala;
    altura = t.altura * escala;
  }

  const centro = deLocal(t, { x: ancoraX + (hx * largura) / 2, y: ancoraY + (hy * altura) / 2 });
  return { ...t, largura, altura, cx: centro.x, cy: centro.y };
}

export function extremidadesDaLinha(linha: Transformacao): { inicio: Ponto; fim: Ponto } {
  return {
    inicio: deLocal(linha, { x: -linha.largura / 2, y: 0 }),
    fim: deLocal(linha, { x: linha.largura / 2, y: 0 }),
  };
}

/** Move uma ponta da linha livremente (muda comprimento e ângulo); a outra ponta fica fixa. */
export function arrastarExtremidadeDaLinha(linha: ElementoLinha, qual: "inicio" | "fim", ponto: Ponto): ElementoLinha {
  const { inicio, fim } = extremidadesDaLinha(linha);
  const geometria = qual === "fim" ? linhaEntre(inicio, ponto) : linhaEntre(ponto, fim);
  return { ...linha, ...geometria, largura: Math.max(TAMANHO_MINIMO, geometria.largura) };
}

/** Redimensiona o texto pela alça de canto: escala a fonte e mantém o canto oposto fixo. */
export function redimensionarTexto(texto: ElementoTexto, alca: Alca, ponto: Ponto): ElementoTexto {
  const redimensionado = redimensionarPorAlca(texto, alca, ponto, { proporcional: true });
  const fator = redimensionado.largura / texto.largura;
  return { ...redimensionado, tamanhoFonte: Math.max(8, texto.tamanhoFonte * fator) };
}

export function atualizarTexto(texto: ElementoTexto, alteracoes: Partial<Pick<ElementoTexto, "texto" | "tamanhoFonte" | "negrito" | "cor">>): ElementoTexto {
  const novo = { ...texto, ...alteracoes };
  return { ...novo, ...caixaDoTexto(novo.texto, novo.tamanhoFonte, novo.negrito) };
}

// ---------- imagem do produto ----------

const MARGEM_PADRAO_IMAGEM = 0.9;

/** Imagem ajustada ao quadro (contain), centralizada, respeitando a proporção original. */
export function transformacaoPadraoDaImagem(proporcao?: number): Transformacao {
  let largura = LARGURA_DESENHO * MARGEM_PADRAO_IMAGEM;
  let altura = ALTURA_DESENHO * MARGEM_PADRAO_IMAGEM;
  if (proporcao && proporcao > 0) {
    if (proporcao > largura / altura) altura = largura / proporcao;
    else largura = altura * proporcao;
  }
  return {
    cx: LARGURA_DESENHO / 2,
    cy: ALTURA_DESENHO / 2,
    largura,
    altura,
    rotacao: 0,
    espelhoH: false,
    espelhoV: false,
  };
}

// ---------- lista de elementos: duplicar e camadas ----------

export function duplicarElemento(elemento: ElementoDesenho, deslocamento = 24): ElementoDesenho {
  return limitarCentro({ ...elemento, id: novoId(), cx: elemento.cx + deslocamento, cy: elemento.cy + deslocamento });
}

export type OperacaoCamada = "frente" | "tras" | "topo" | "fundo";

/** O primeiro item da lista fica por baixo; o último, por cima. */
export function reordenarCamada(elementos: ElementoDesenho[], id: string, operacao: OperacaoCamada): ElementoDesenho[] {
  const indice = elementos.findIndex((e) => e.id === id);
  if (indice === -1) return elementos;
  const lista = [...elementos];
  const [elemento] = lista.splice(indice, 1);
  const destino = {
    frente: Math.min(lista.length, indice + 1),
    tras: Math.max(0, indice - 1),
    topo: lista.length,
    fundo: 0,
  }[operacao];
  lista.splice(destino, 0, elemento);
  return lista;
}

export function substituirElemento(elementos: ElementoDesenho[], novo: ElementoDesenho): ElementoDesenho[] {
  return elementos.map((e) => (e.id === novo.id ? novo : e));
}

export function removerElemento(elementos: ElementoDesenho[], id: string): ElementoDesenho[] {
  return elementos.filter((e) => e.id !== id);
}

// ---------- histórico (desfazer/refazer) ----------

export type Historico = { passado: DesenhoEstado[]; futuro: DesenhoEstado[] };

export const HISTORICO_VAZIO: Historico = { passado: [], futuro: [] };
const LIMITE_HISTORICO = 100;

export function registrarNoHistorico(historico: Historico, atual: DesenhoEstado): Historico {
  return { passado: [...historico.passado, atual].slice(-LIMITE_HISTORICO), futuro: [] };
}

export function desfazer(historico: Historico, atual: DesenhoEstado): { historico: Historico; desenho: DesenhoEstado } | null {
  const anterior = historico.passado.at(-1);
  if (!anterior) return null;
  return {
    desenho: anterior,
    historico: { passado: historico.passado.slice(0, -1), futuro: [atual, ...historico.futuro] },
  };
}

export function refazer(historico: Historico, atual: DesenhoEstado): { historico: Historico; desenho: DesenhoEstado } | null {
  const proximo = historico.futuro[0];
  if (!proximo) return null;
  return {
    desenho: proximo,
    historico: { passado: [...historico.passado, atual], futuro: historico.futuro.slice(1) },
  };
}
