import html2canvas from "html2canvas";

const LARGURA_CAPTURA = 1400;
const SVG_NS = "http://www.w3.org/2000/svg";

const CONFIG_BARRAS: Record<string, { fontSize: number; alinhamento: "left" | "center"; paddingX: number }> = {
  titulo: { fontSize: 18, alinhamento: "left", paddingX: 16 },
  desenho: { fontSize: 14, alinhamento: "center", paddingX: 0 },
  compras: { fontSize: 12, alinhamento: "center", paddingX: 0 },
};

/**
 * As barras de título (DocumentoCroqui) usam flex pra centralizar o texto —
 * funciona certinho na tela, mas o html2canvas não lida bem com texto
 * centralizado (via padding, flex ou line-height) dentro dessas barras: o
 * texto sai desalinhado ou o fundo não pinta a altura toda, só na
 * exportação. Substituímos essas barras por um <svg> equivalente (retângulo
 * + texto centralizado nativamente pelo SVG) — a mesma técnica que já
 * resolveu esse tipo de problema nas réguas de medida do desenho.
 */
function substituirBarrasPorSvg(clone: HTMLElement): void {
  clone.querySelectorAll<HTMLElement>("[data-barra-exportacao]").forEach((barra) => {
    const config = CONFIG_BARRAS[barra.dataset.barraExportacao ?? ""];
    if (!config) return;

    const largura = barra.offsetWidth;
    const altura = barra.offsetHeight;
    if (largura === 0 || altura === 0) return;

    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("width", String(largura));
    svg.setAttribute("height", String(altura));
    svg.setAttribute("viewBox", `0 0 ${largura} ${altura}`);
    // <svg> é um elemento substituído inline por padrão, o que deixa uns
    // pixels de espaço embaixo dele (o mesmo espaço "fantasma" clássico de
    // <img> alinhado pela linha de base). Isso soma uma altura a mais em cada
    // uma das 3 barras substituídas, depois que a proporção alvo já foi
    // calculada com base na altura ORIGINAL (sem esse espaço extra) — dava
    // uma tarja branca fina e persistente que nenhuma quantidade de
    // iterações do ajuste de largura conseguia corrigir, já que a medição
    // acontecia antes dessa troca.
    svg.style.display = "block";

    const retangulo = document.createElementNS(SVG_NS, "rect");
    retangulo.setAttribute("width", String(largura));
    retangulo.setAttribute("height", String(altura));
    retangulo.setAttribute("fill", "#991b1b");
    svg.appendChild(retangulo);

    const texto = document.createElementNS(SVG_NS, "text");
    texto.setAttribute("x", config.alinhamento === "left" ? String(config.paddingX) : String(largura / 2));
    texto.setAttribute("y", String(altura / 2));
    texto.setAttribute("text-anchor", config.alinhamento === "left" ? "start" : "middle");
    texto.setAttribute("dominant-baseline", "middle");
    texto.setAttribute("font-size", String(config.fontSize));
    texto.setAttribute("font-weight", "bold");
    texto.setAttribute("font-family", "sans-serif");
    texto.setAttribute("fill", "#ffffff");
    texto.textContent = barra.textContent ?? "";
    svg.appendChild(texto);

    barra.replaceWith(svg);
  });
}

function criarClonePreparado(elemento: HTMLElement, largura: number): { clone: HTMLElement; contêiner: HTMLElement } {
  const clone = elemento.cloneNode(true) as HTMLElement;
  const contêiner = document.createElement("div");
  contêiner.style.position = "fixed";
  contêiner.style.top = "0";
  contêiner.style.left = "-99999px";
  contêiner.style.width = `${largura}px`;
  // O html2canvas não entende a função de cor oklch() que o Tailwind v4 usa
  // por padrão. O documento em si já usa hex puro, mas sem isso aqui o clone
  // herdava a cor de texto do <body> da página (que usa a paleta padrão,
  // em oklch) e a captura falhava com "unsupported color function oklch".
  contêiner.style.color = "#000000";
  contêiner.style.backgroundColor = "#ffffff";
  clone.style.width = `${largura}px`;
  contêiner.appendChild(clone);
  document.body.appendChild(contêiner);
  return { clone, contêiner };
}

/**
 * Aproxima a largura ideal medindo o layout via DOM (offsetHeight) — rápido,
 * mas só uma aproximação: o html2canvas nem sempre desenha com exatamente as
 * mesmas dimensões que o navegador mediu (quebra de linha bem no limite,
 * métricas de fonte etc.), então o resultado pode sair um pouco fora da
 * proporção pedida dependendo do conteúdo.
 */
function aproximarLarguraPorDom(clone: HTMLElement, razaoAlvo: number, larguraInicial: number): number {
  const AMORTECIMENTO = 0.5;
  let largura = larguraInicial;
  for (let tentativa = 0; tentativa < 8; tentativa++) {
    const alturaAtual = clone.offsetHeight;
    const larguraIdeal = alturaAtual * razaoAlvo;
    if (larguraIdeal <= 0) break;
    largura += AMORTECIMENTO * (larguraIdeal - largura);
    clone.style.width = `${Math.round(largura)}px`;
  }
  return largura;
}

/**
 * O elemento visível fica preso à largura estreita do wizard (max-w-2xl),
 * o que faz o croqui crescer na vertical. Para a exportação sair no formato
 * horizontal esperado, capturamos um clone fora da tela com uma largura bem
 * maior — o mesmo CSS reflui o conteúdo num formato bem mais largo/baixo.
 *
 * `razaoAlvo` (largura/altura) é opcional: quando informado (ex: pela
 * exportação de imagem, que encaixa o resultado num quadro de proporção
 * fixa), a largura da captura é ajustada para que o conteúdo já saia bem
 * próximo dessa proporção — assim o quadro final não sobra com tarjas
 * brancas nem precisa cortar as laterais pra preencher.
 */
// O ajuste de proporção (DOM + captura de teste) ainda erra um pouco pra
// mais na largura (o "cover" final acaba cortando um pouco dos lados). Mirar
// numa proporção levemente mais estreita do que a pedida compensa esse viés
// residual, sem precisar de mais rodadas de correção. Exportado só pra os
// testes conseguirem simular um cenário "sem divergência" de forma exata.
export const FATOR_VIES_LARGURA = 0.985;

// html2canvas lê a cor de fundo do <html> e do <body> da página, e o tema escuro usa
// `dark:bg-gray-950` — uma cor `oklch()` que ele não entende ("unsupported color function
// oklch"), derrubando o PDF e a imagem. Durante a captura trocamos esse fundo por um hex
// equivalente (gray-950 no escuro, branco no claro), sem piscar a tela, e restauramos depois.
const FUNDO_ESCURO_HEX = "#030712";
const FUNDO_CLARO_HEX = "#ffffff";

async function comFundoCompativelComHtml2canvas<T>(acao: () => Promise<T>): Promise<T> {
  const raiz = document.documentElement;
  const corpo = document.body;
  const anterior = { raiz: raiz.style.backgroundColor, corpo: corpo.style.backgroundColor };
  const cor = raiz.classList.contains("dark") ? FUNDO_ESCURO_HEX : FUNDO_CLARO_HEX;
  raiz.style.backgroundColor = cor;
  corpo.style.backgroundColor = cor;
  try {
    return await acao();
  } finally {
    raiz.style.backgroundColor = anterior.raiz;
    corpo.style.backgroundColor = anterior.corpo;
  }
}

/** A imagem com áreas apagadas é gerada em memória; capturar antes disso exportaria a imagem sem os apagamentos. */
export async function aguardarImagensProntas(elemento: HTMLElement, limiteMs = 15000): Promise<void> {
  const inicio = Date.now();
  while (elemento.querySelector("[data-processando]") && Date.now() - inicio < limiteMs) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

export async function capturarDocumentoLargo(elemento: HTMLElement, razaoAlvo?: number): Promise<HTMLCanvasElement> {
  await aguardarImagensProntas(elemento);
  return comFundoCompativelComHtml2canvas(() => capturarSemAjusteDeFundo(elemento, razaoAlvo));
}

async function capturarSemAjusteDeFundo(elemento: HTMLElement, razaoAlvo?: number): Promise<HTMLCanvasElement> {
  let larguraFinal = LARGURA_CAPTURA;

  if (razaoAlvo) {
    const razaoAlvoAjustada = razaoAlvo * FATOR_VIES_LARGURA;
    const { clone, contêiner } = criarClonePreparado(elemento, LARGURA_CAPTURA);
    try {
      let largura = aproximarLarguraPorDom(clone, razaoAlvoAjustada, LARGURA_CAPTURA);

      // Medir a largura/altura reais das barras (pra trocar pelo SVG) só
      // depois de qualquer ajuste de largura acima, senão o SVG sai com o
      // tamanho errado. As barras ficam com a largura fixa de agora em
      // diante — as capturas de teste abaixo mudam só a largura do clone
      // como um todo, então a barra pode ficar temporariamente sem bater
      // com a largura da página nesses testes intermediários (descartados);
      // só a captura final (com um clone novo) importa pro resultado.
      substituirBarrasPorSvg(clone);

      // A aproximação por DOM pode não bater exatamente com o que o
      // html2canvas desenha de verdade (quebra de linha bem no limite,
      // métricas de fonte etc.). Uma rodada de capturas de teste baratas
      // (scale 1, descartadas depois) mede a proporção REAL já renderizada e
      // corrige a largura — mais confiável do que só medir o DOM. Repetir
      // com amortecimento (em vez de corrigir tudo de uma vez) evita
      // ultrapassar o alvo: uma correção única de mais pode trocar a tarja
      // branca de lugar (de cima/baixo pra lateral) em vez de eliminá-la,
      // porque a altura real não escala de forma linear com a largura.
      const AMORTECIMENTO = 0.5;
      for (let tentativa = 0; tentativa < 8; tentativa++) {
        const canvasTeste = await html2canvas(clone, { scale: 1, backgroundColor: "#ffffff", useCORS: true });
        const razaoReal = canvasTeste.width / canvasTeste.height;
        if (razaoReal <= 0) break;
        const larguraIdeal = largura * (razaoAlvoAjustada / razaoReal);
        largura += AMORTECIMENTO * (larguraIdeal - largura);
        clone.style.width = `${Math.round(largura)}px`;
      }
      larguraFinal = Math.round(largura);
    } finally {
      document.body.removeChild(contêiner);
    }
  }

  const { clone, contêiner } = criarClonePreparado(elemento, larguraFinal);
  try {
    substituirBarrasPorSvg(clone);
    return await html2canvas(clone, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
  } finally {
    document.body.removeChild(contêiner);
  }
}
