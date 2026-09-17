import type { ConfigProduto } from "./tipos";

export const esquadria: ConfigProduto = {
  id: "esquadria",
  nome: "Esquadrias Encomenda",
  tituloDocumento: "ENCOMENDA ESPECIAL ESQUADRIAS",
  prazoEntregaDias: 60,
  campos: [
    { id: "altura", tipo: "medida", unidade: "m", label: "Altura", obrigatorio: true },
    { id: "largura", tipo: "medida", unidade: "m", label: "Largura", obrigatorio: true },
    { id: "caixa", tipo: "medida", unidade: "m", label: "Caixa" },
    { id: "padraoMadeira", tipo: "texto", label: "Padrão de madeira" },
    { id: "medidasGuarnicao", tipo: "medida", unidade: "m", label: "Medidas de guarnição" },
    { id: "ladosGuarnicao", tipo: "opcao-unica", label: "Lados", opcoes: ["UM LADO", "DOIS LADOS"] },
    { id: "tipoPalheta", tipo: "texto", label: "Tipo de palheta" },
    { id: "formatoPalheta", tipo: "opcao-unica", label: "Formato da palheta", opcoes: ["RETO", "ARCO"] },
    { id: "acabamentoFerragem", tipo: "texto", label: "Acabamento da ferragem" },
    { id: "comSemFerragem", tipo: "opcao-unica", label: "Ferragem", opcoes: ["COM FERRAGENS", "SEM FERRAGENS"] },
    { id: "tipoAbertura", tipo: "texto", label: "Tipo de abertura" },
    { id: "ladoAbertura", tipo: "texto", label: "Lado de abertura" },
    {
      id: "vidros",
      tipo: "opcao-unica",
      label: "Vidros",
      opcoes: [
        "CONSIDERAR QUANTIDADE DE VIDROS DO DESENHO",
        "FAZER QUANTIDADE E TAMANHOS PROPORCIONAIS ÀS MEDIDAS DA PEÇA",
        "QUANTIDADES E TAMANHOS A CRITÉRIO DA FÁBRICA",
      ],
    },
  ],
};
