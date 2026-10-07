import type { EstadoPedido } from "./pedido";
import { PRODUTOS } from "@/produtos";
import type { TipoProdutoId } from "@/produtos/tipos";
import { bufferMedidaParaMetros } from "./formatacao";

export type DescricaoImagem = Record<string, unknown>;

const FUNDO_RECORTADO_BRANCO = { tipo: "Recortado", cor: "Branco" };

const INSTRUCAO_BASE =
  "Gere uma imagem fotorrealista de catálogo de produto, em alta resolução, sem texto, " +
  "sem marcas d'água e sem pessoas, seguindo fielmente a descrição estruturada em JSON abaixo.";
const INSTRUCAO_REFERENCIA =
  " A imagem anexa é apenas uma referência de estilo e acabamento: mantenha a mesma linguagem visual, " +
  "mas respeite as características descritas no JSON quando divergirem dela.";

export function podeGerarImagem(tipo: TipoProdutoId | null): boolean {
  return tipo !== null && PRODUTOS[tipo].permiteGerarImagem === true;
}

// ---------- utilitários ----------

function selecionadas(estado: EstadoPedido, id: string): string[] {
  const valor = estado.especificacoes[id];
  return valor ? valor.split("|").filter(Boolean) : [];
}

function texto(estado: EstadoPedido, id: string): string | undefined {
  const valor = estado.especificacoes[id]?.trim();
  return valor ? valor : undefined;
}

function minusculas(valor: string): string {
  return valor.toLocaleLowerCase("pt-BR");
}

function listaMinusculas(valores: string[]): string | undefined {
  return valores.length > 0 ? valores.map(minusculas).join(" e ") : undefined;
}

function metros(estado: EstadoPedido, id: string): number | undefined {
  const config = estado.tipo ? PRODUTOS[estado.tipo] : null;
  const campo = config?.campos.find((c) => c.id === id);
  const buffer = estado.especificacoes[id];
  if (!campo || campo.tipo !== "medida" || !buffer) return undefined;
  const valor = bufferMedidaParaMetros(buffer, campo.casasDecimais ?? 3);
  return valor > 0 ? valor : undefined;
}

/**
 * Modelos de imagem não respeitam medidas exatas, então só repassamos a
 * proporção aproximada da peça (e nunca os números absolutos).
 */
function proporcao(horizontal: number | undefined, vertical: number | undefined): string | undefined {
  if (!horizontal || !vertical) return undefined;
  const razao = horizontal / vertical;
  const razaoFormatada = razao.toFixed(2).replace(".", ",");
  if (razao >= 1.15) return `Orientação horizontal (largura ≈ ${razaoFormatada} vezes a altura)`;
  if (razao <= 0.87) return `Orientação vertical (largura ≈ ${razaoFormatada} vezes a altura)`;
  return "Proporção aproximadamente quadrada";
}

/** Remove strings vazias, undefined e objetos que ficaram vazios, recursivamente. */
export function limparDescricao<T>(valor: T): T | undefined {
  if (valor === undefined || valor === null) return undefined;
  if (typeof valor === "string") return (valor.trim() === "" ? undefined : valor) as T | undefined;
  if (Array.isArray(valor)) {
    const itens = valor.map((item) => limparDescricao(item)).filter((item) => item !== undefined);
    return (itens.length > 0 ? itens : undefined) as T | undefined;
  }
  if (typeof valor === "object") {
    const entradas = Object.entries(valor as Record<string, unknown>)
      .map(([chave, item]) => [chave, limparDescricao(item)] as const)
      .filter(([, item]) => item !== undefined);
    return (entradas.length > 0 ? Object.fromEntries(entradas) : undefined) as T | undefined;
  }
  return valor;
}

function observacoesDoPedido(estado: EstadoPedido) {
  return {
    descricao_do_produto: estado.pedido.descricao,
    informacao_adicional: estado.pedido.notaAdicional,
  };
}

// ---------- mapeamentos de vocabulário ----------

const ESTILO_PAINEL_ESQUADRIA: Record<string, string> = {
  "PANORÂMICO": "Grandes vidros panorâmicos com poucas divisões de madeira",
  "SEMI-PANORÂMICO": "Vidros amplos com poucas divisões de madeira",
  QUADRICULADO: "Vidros divididos em quadrados por travessas finas de madeira",
  VENEZIANA: "Veneziana (painéis preenchidos com ripas horizontais inclinadas)",
};

const DESCRICAO_VIDROS: Record<string, string> = {
  "CONSIDERAR QUANTIDADE DE VIDROS DO DESENHO": "Quantidade de vidros conforme a referência visual",
  "FAZER QUANTIDADE E TAMANHOS PROPORCIONAIS ÀS MEDIDAS DA PEÇA":
    "Vidros em quantidade e tamanhos proporcionais às medidas da peça",
  "QUANTIDADES E TAMANHOS A CRITÉRIO DA FÁBRICA": "Divisão dos vidros livre, a critério do fabricante",
};

const ACABAMENTO_FERRAGEM: Record<string, string> = {
  CROMADO: "Cromado (prateado brilhante)",
  PRETO: "Preto fosco",
  LO: "Latão oxidado (LO), dourado envelhecido",
};

const LADOS_GUARNICAO: Record<string, string> = {
  "UM LADO": "Guarnição (moldura de acabamento) aplicada em um lado",
  "DOIS LADOS": "Guarnição (moldura de acabamento) aplicada nos dois lados",
};

// ---------- esquadria ----------

function descreverEsquadria(estado: EstadoPedido): DescricaoImagem {
  const categorias = selecionadas(estado, "categoria");
  const ferragem = texto(estado, "comSemFerragem");
  const tipoAbertura = texto(estado, "tipoAbertura");
  const ladoAbertura = texto(estado, "ladoAbertura");
  const vidros = texto(estado, "vidros");
  const formato = texto(estado, "formatoEsquadria");
  const palheta = texto(estado, "tipoPalheta");
  const lados = texto(estado, "ladosGuarnicao");
  const acabamento = texto(estado, "acabamentoFerragem");
  const formaGeral = proporcao(metros(estado, "largura"), metros(estado, "altura"));

  return {
    detalhes_do_objeto: {
      categoria: "Esquadria de madeira",
      tipo_especifico: categorias.length > 0 ? `Esquadria ${listaMinusculas(categorias)}` : "Esquadria",
      formato_geral: [formato ? `Formato ${minusculas(formato)}` : undefined, formaGeral]
        .filter(Boolean)
        .join(". "),
    },
    materiais_e_acabamentos: {
      material_base: "Madeira maciça",
      padrao_de_madeira: texto(estado, "padraoMadeira"),
      textura: "Superfície lisa com veios naturais da madeira visíveis",
      material_secundario: ferragem === "COM FERRAGENS" ? "Metal (utilizado nas ferragens)" : undefined,
    },
    estrutura_e_componentes: {
      caixilharia: {
        descricao: "Moldura perimetral externa robusta, em madeira",
        guarnicao: lados ? LADOS_GUARNICAO[lados] : undefined,
      },
      folhas_da_janela: {
        estilo_dos_paineis: categorias.map((c) => ESTILO_PAINEL_ESQUADRIA[c]).filter(Boolean),
        tipo_de_palheta: palheta ? minusculas(palheta) : undefined,
        divisao_dos_vidros: vidros ? (DESCRICAO_VIDROS[vidros] ?? minusculas(vidros)) : undefined,
      },
      sistema_de_movimentacao: {
        mecanismo: tipoAbertura ? minusculas(tipoAbertura) : undefined,
        lado_de_abertura: ladoAbertura ? minusculas(ladoAbertura) : undefined,
      },
    },
    ferragens_visiveis:
      ferragem === "SEM FERRAGENS"
        ? { observacao: "Sem ferragens visíveis" }
        : ferragem === "COM FERRAGENS"
          ? {
              presenca: "Ferragens visíveis (puxadores e fecho)",
              acabamento: acabamento ? (ACABAMENTO_FERRAGEM[acabamento] ?? minusculas(acabamento)) : undefined,
            }
          : undefined,
    observacoes_do_pedido: observacoesDoPedido(estado),
    fundo: FUNDO_RECORTADO_BRANCO,
  };
}

// ---------- portas ----------

function descreverPorta(estado: EstadoPedido): DescricaoImagem {
  const tipo = estado.tipo as TipoProdutoId;
  const ehAcm = tipo === "porta-acm";
  const tipoFolha = selecionadas(estado, "tipoFolha");
  const conjunto = tipoFolha.includes("CONJUNTO");
  const lados = texto(estado, "ladosGuarnicao");
  const abertura = texto(estado, "tipoAbertura");
  const ladoAbertura = texto(estado, "ladoAbertura");
  const friso = texto(estado, "friso");
  const cava = texto(estado, "cava");
  const cavaLados = texto(estado, "cavaLados");
  const madeira = texto(estado, "madeira") ?? texto(estado, "padraoMadeira");
  const estiloFolha = tipoFolha.filter((t) => t === "FRISADA" || t === "RASGADA");
  const espessuraMm = texto(estado, "espessuraFolha");

  return {
    detalhes_do_objeto: {
      categoria: ehAcm ? "Porta de ACM (alumínio composto)" : "Porta de madeira",
      tipo_especifico: conjunto ? "Conjunto: folha com batente e guarnição" : tipoFolha.includes("SÓ FOLHA") ? "Somente a folha da porta" : undefined,
      formato_geral: proporcao(metros(estado, "larguraFolha"), metros(estado, "alturaFolha")) ?? "Retangular, orientação vertical",
    },
    materiais_e_acabamentos: ehAcm
      ? {
          material_base: "Painel de ACM (alumínio composto)",
          cor: texto(estado, "corAcm"),
          textura: "Superfície lisa, uniforme e fosca",
        }
      : {
          material_base: "Madeira maciça",
          padrao_de_madeira: madeira ? minusculas(madeira) : undefined,
          espessura_da_folha: tipo === "porta-marcenaria" ? espessuraMm : undefined,
          textura: "Superfície lisa com veios naturais da madeira visíveis",
        },
    estrutura_e_componentes: {
      folha: {
        estilo: listaMinusculas(estiloFolha),
        friso: friso ? `Friso em ${minusculas(friso)}` : undefined,
        modelo_do_friso: texto(estado, "modeloFriso"),
        cava: cava ? `Cava ${minusculas(cava)}${cavaLados ? ` em ${minusculas(cavaLados)}` : ""}` : undefined,
      },
      batente_e_guarnicao: conjunto
        ? {
            batente: "Batente completo em volta da folha",
            guarnicao: lados ? LADOS_GUARNICAO[lados] : undefined,
          }
        : undefined,
      abertura: {
        tipo: abertura ? minusculas(abertura) : undefined,
        lado: ladoAbertura ? minusculas(ladoAbertura) : undefined,
      },
    },
    ferragens_visiveis: {
      fechadura_e_ferragem: texto(estado, "tipoFerragemFechadura"),
      lado_da_macaneta: texto(estado, "ladoMacaneta"),
    },
    observacoes_do_pedido: observacoesDoPedido(estado),
    fundo: FUNDO_RECORTADO_BRANCO,
  };
}

// ---------- degrau / patamar / rodapé ----------

type PecaDegrau = "degrau" | "patamar" | "rodape";

/** Usado só como fallback (rascunhos antigos, sem o campo "Peça"): deduz a peça pela descrição digitada. */
export function detectarPecaDegrau(descricao: string): PecaDegrau {
  const normalizada = descricao
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("pt-BR");
  if (/\brodape/.test(normalizada)) return "rodape";
  if (/\bpatamar/.test(normalizada)) return "patamar";
  return "degrau";
}

const PRESETS_DEGRAU: Record<
  PecaDegrau,
  { assunto: string; formato: string; textura: string; acabamento: string; posicionamento: string }
> = {
  degrau: {
    assunto: "Degrau de madeira",
    formato: "Prancha retangular fina e plana, de baixa espessura (não é um bloco, viga ou tijolo maciço)",
    textura: "Superfície lisa com veios naturais da madeira visíveis",
    acabamento: "Arestas retas e definidas",
    posicionamento:
      "Peça deitada na horizontal, apoiada na face maior. Vista em perspetiva, exibindo a face frontal ampla, o rebordo superior e a secção de corte lateral direita",
  },
  rodape: {
    assunto: "Rodapé de madeira",
    formato: "Retangular, longo e fino (tábua de baixa espessura)",
    textura: "Grão e veios naturais da madeira visíveis",
    acabamento: "Rebordo superior arredondado (boleado)",
    posicionamento:
      "Peça deitada na horizontal. Vista em perspetiva, estendendo-se do canto inferior esquerdo em direção ao canto superior direito",
  },
  patamar: {
    assunto: "Patamar de madeira",
    formato: "Placa plana, ampla e de baixa espessura",
    textura: "Superfície plana com veios naturais da madeira alinhados verticalmente",
    acabamento: "Arestas retas",
    posicionamento: "Vista superior, com a peça na horizontal, exibindo a face principal plana e ampla",
  },
};

const PECA_POR_OPCAO: Record<string, PecaDegrau> = { DEGRAU: "degrau", PATAMAR: "patamar", "RODAPÉ": "rodape" };

export function pecaDoPedido(estado: EstadoPedido): PecaDegrau {
  const escolhida = texto(estado, "tipoPeca");
  return (escolhida && PECA_POR_OPCAO[escolhida]) || detectarPecaDegrau(estado.pedido.descricao);
}

const METROS_POR_UNIDADE = { m: 1, cm: 0.01, mm: 0.001 } as const;

/** Valor de uma medida convertido para metros, respeitando a unidade do campo. */
function medidaEmMetros(estado: EstadoPedido, id: string): number | undefined {
  const config = estado.tipo ? PRODUTOS[estado.tipo] : null;
  const campo = config?.campos.find((c) => c.id === id);
  const valor = metros(estado, id);
  if (!campo || campo.tipo !== "medida" || valor === undefined) return undefined;
  return valor * METROS_POR_UNIDADE[campo.unidade];
}

/** Espessura sempre descrita como fração da largura: modelos tendem a exagerar peças finas. */
const ESPESSURA_PADRAO_PERCENTUAL: Record<PecaDegrau, number> = { degrau: 12, rodape: 10, patamar: 8 };
const ESPESSURA_MAXIMA_PERCENTUAL = 25;

function descreverEspessura(estado: EstadoPedido, peca: PecaDegrau): string {
  const espessura = medidaEmMetros(estado, "espessura");
  const largura = medidaEmMetros(estado, "largura");
  const real = espessura && largura ? (espessura / largura) * 100 : 0;
  const percentual = Math.round(Math.min(real > 0 ? real : ESPESSURA_PADRAO_PERCENTUAL[peca], ESPESSURA_MAXIMA_PERCENTUAL));
  return `Peça fina: a espessura (altura da lateral) é só cerca de ${percentual}% da largura, bem menor que as demais dimensões`;
}

/** Alongamento mínimo (comprimento ÷ largura) por peça, para o modelo não desenhar uma placa "quadrada" ou em pé. */
const ALONGAMENTO_MINIMO: Record<PecaDegrau, number> = { degrau: 3, rodape: 6, patamar: 1 };
const ALONGAMENTO_MAXIMO = 12;

function descreverAlongamento(estado: EstadoPedido, peca: PecaDegrau): string | undefined {
  const comprimento = metros(estado, "comprimento");
  const largura = metros(estado, "largura");
  const real = comprimento && largura ? comprimento / largura : 0;
  const razao = Math.min(Math.max(real, ALONGAMENTO_MINIMO[peca]), ALONGAMENTO_MAXIMO);
  if (razao < 1.15) return undefined;
  const aproximada = razao.toFixed(1).replace(".", ",");
  return `Comprimento (lado maior) cerca de ${aproximada} vezes a largura: peça nitidamente alongada, bem mais comprida do que larga`;
}

function descreverDegrau(estado: EstadoPedido): DescricaoImagem {
  const peca = pecaDoPedido(estado);
  const preset = PRESETS_DEGRAU[peca];
  const madeira = texto(estado, "tipoMadeira");
  const alongamento = descreverAlongamento(estado, peca);

  return {
    descricao_da_imagem: {
      assunto_principal: preset.assunto,
      tipo_de_objeto: peca === "rodape" ? "Rodapé" : peca === "patamar" ? "Patamar" : "Degrau",
      detalhes_do_objeto: {
        material: madeira ? `Madeira (${minusculas(madeira)})` : "Madeira",
        cor: madeira ? `Tonalidade natural de ${minusculas(madeira)}` : "Castanho claro com tom de mel",
        textura: preset.textura,
        formato: preset.formato,
        orientacao: "Horizontal: o comprimento (lado maior) segue o eixo horizontal da imagem; a peça nunca aparece em pé",
        proporcao: alongamento,
        espessura: descreverEspessura(estado, peca),
        acabamento: preset.acabamento,
        posicionamento: preset.posicionamento,
      },
      observacoes_do_pedido: observacoesDoPedido(estado),
      fundo: FUNDO_RECORTADO_BRANCO,
    },
  };
}

// ---------- API pública ----------

export function montarDescricaoImagem(estado: EstadoPedido): DescricaoImagem | null {
  if (!podeGerarImagem(estado.tipo)) return null;
  let bruta: DescricaoImagem;
  switch (estado.tipo) {
    case "esquadria":
      bruta = descreverEsquadria(estado);
      break;
    case "degrau-patamar-rodape":
      bruta = descreverDegrau(estado);
      break;
    default:
      bruta = descreverPorta(estado);
  }
  return limparDescricao(bruta) ?? null;
}

export function montarPromptImagem(estado: EstadoPedido, opcoes: { temReferencia?: boolean } = {}): string | null {
  const descricao = montarDescricaoImagem(estado);
  if (!descricao) return null;
  const instrucao = INSTRUCAO_BASE + (opcoes.temReferencia ? INSTRUCAO_REFERENCIA : "");
  return `${instrucao}\n\n${JSON.stringify(descricao, null, 2)}`;
}
