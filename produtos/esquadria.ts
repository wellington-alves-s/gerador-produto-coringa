import type { Campo, ConfigProduto } from "./tipos";

const PORTA_CORRER = "PORTA DE CORRER";
const PORTA_BALCAO = "PORTA BALCÃO";
const JANELA = "JANELA";
const VITRO = "VITRÔ";
const FIXO = "FIXO";

/** Aberturas permitidas por família (ver docs/superpowers/specs/2026-11-20-esquadria-familia-design.md). */
const ABERTURAS_POR_FAMILIA: Record<string, string[]> = {
  [PORTA_CORRER]: ["CORRER", "PANTOGRÁFICA", "CAMARÃO", "GIRO"],
  [PORTA_BALCAO]: ["ABRIR/ABRIR", "CORRER/ABRIR", "GIRO"],
  [JANELA]: ["CORRER", "ABRIR/ABRIR", "CORRER/ABRIR", "GUILHOTINA/ABRIR", "PANTOGRÁFICA", "BY WINDOW", "GIRO"],
  [VITRO]: ["CORRER", "ABRIR/ABRIR", "PIVOTANTE", "BASCULANTE", "MAX-AR", "GIRO"],
};
const COM_ABERTURA = Object.keys(ABERTURAS_POR_FAMILIA);
const COM_ABERTURA_REGRA = { campoId: "tipoEsquadria", valores: COM_ABERTURA };

const campos: Campo[] = [
  {
    id: "tipoEsquadria",
    tipo: "opcao-unica",
    label: "Tipo de esquadria",
    opcoes: [PORTA_CORRER, PORTA_BALCAO, JANELA, VITRO, FIXO],
    obrigatorio: true,
    exibirApenasSelecionadas: true,
  },
  {
    id: "categoria",
    tipo: "multipla-escolha",
    label: "Categoria",
    opcoes: ["PANORÂMICO", "SEMI-PANORÂMICO", "QUADRICULADO", "VENEZIANA"],
    gruposExcludentes: [["PANORÂMICO", "SEMI-PANORÂMICO", "QUADRICULADO"]],
    exibirApenasSelecionadas: true,
  },
  { id: "altura", tipo: "medida", unidade: "m", label: "Altura", obrigatorio: true, linha: 1 },
  { id: "largura", tipo: "medida", unidade: "m", label: "Largura", obrigatorio: true, linha: 1 },
  {
    id: "caixa",
    tipo: "medida",
    unidade: "cm",
    casasDecimais: 1,
    casasInteiras: 2,
    label: "Caixa",
    obrigatorio: true,
    linha: 1,
  },
  { id: "padraoMadeira", tipo: "texto", label: "Padrão de madeira", obrigatorio: true, linha: 1 },
  {
    id: "medidasGuarnicao",
    tipo: "medida",
    unidade: "cm",
    casasDecimais: 1,
    casasInteiras: 2,
    label: "Medidas de guarnição",
    obrigatorio: true,
    linha: 2,
  },
  {
    id: "ladosGuarnicao",
    tipo: "opcao-unica",
    label: "Lados",
    opcoes: ["UM LADO", "DOIS LADOS"],
    exibirApenasSelecionadas: true,
    linha: 2,
  },
  {
    id: "tipoPalheta",
    tipo: "opcao-unica",
    label: "Tipo de palheta",
    opcoes: ["FRANCESA", "SEMI-PORTUGUESA", "RETA"],
    obrigatorio: true,
    exibirApenasSelecionadas: true,
    visivelQuando: { campoId: "categoria", valores: ["VENEZIANA"] },
  },
  {
    id: "formatoEsquadria",
    tipo: "opcao-unica",
    label: "Formato da esquadria",
    opcoes: ["RETO", "ARCO"],
    exibirApenasSelecionadas: true,
  },
  {
    id: "comSemFerragem",
    tipo: "opcao-unica",
    label: "Ferragem",
    opcoes: ["COM FERRAGENS", "SEM FERRAGENS"],
    obrigatorio: true,
    exibirApenasSelecionadas: true,
    linha: 3,
    visivelQuando: COM_ABERTURA_REGRA,
  },
  {
    id: "acabamentoFerragem",
    tipo: "opcao-unica",
    label: "Acabamento da ferragem",
    opcoes: ["CROMADO", "LO", "PRETO"],
    dependeDe: { campoId: "comSemFerragem", valores: ["COM FERRAGENS"] },
    exibirApenasSelecionadas: true,
    linha: 3,
    visivelQuando: COM_ABERTURA_REGRA,
  },
  {
    id: "tipoAbertura",
    tipo: "opcao-unica",
    label: "Tipo de abertura",
    opcoes: [...new Set(Object.values(ABERTURAS_POR_FAMILIA).flat())],
    opcoesPorValor: { campoId: "tipoEsquadria", mapa: ABERTURAS_POR_FAMILIA },
    obrigatorio: true,
    exibirApenasSelecionadas: true,
    linha: 4,
    visivelQuando: COM_ABERTURA_REGRA,
  },
  {
    id: "ladoAbertura",
    tipo: "opcao-unica",
    label: "Lado de abertura",
    opcoes: ["ESQUERDA", "DIREITA", "CENTRAL", "BANDA LOUCA"],
    obrigatorio: true,
    exibirApenasSelecionadas: true,
    linha: 4,
    visivelQuando: COM_ABERTURA_REGRA,
  },
  {
    id: "vidros",
    tipo: "opcao-unica",
    label: "Vidros",
    opcoes: [
      "CONSIDERAR QUANTIDADE DE VIDROS DO DESENHO",
      "FAZER QUANTIDADE E TAMANHOS PROPORCIONAIS ÀS MEDIDAS DA PEÇA",
      "QUANTIDADES E TAMANHOS A CRITÉRIO DA FÁBRICA",
    ],
    dependeDe: { campoId: "categoria", valores: ["PANORÂMICO", "SEMI-PANORÂMICO", "QUADRICULADO"] },
    visivelQuando: { campoId: "categoria", valores: ["PANORÂMICO", "SEMI-PANORÂMICO", "QUADRICULADO"] },
    exibirApenasSelecionadas: true,
  },
];

// Nada além da escolha do "Tipo de esquadria" aparece antes de ela ser feita.
const REGRA_FAMILIA = { campoId: "tipoEsquadria", valores: [...COM_ABERTURA, FIXO] };

export const esquadria: ConfigProduto = {
  id: "esquadria",
  nome: "Esquadrias Encomenda",
  tituloDocumento: "ENCOMENDA ESPECIAL ESQUADRIAS",
  permiteGerarImagem: true,
  prazoEntregaDias: 60,
  campoLargura: "largura",
  campoAltura: "altura",
  campos: campos.map((campo) => (campo.id === "tipoEsquadria" || campo.visivelQuando ? campo : { ...campo, visivelQuando: REGRA_FAMILIA })),
};
