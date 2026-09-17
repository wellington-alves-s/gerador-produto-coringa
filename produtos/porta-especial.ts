import type { ConfigProduto } from "./tipos";

export const portaEspecial: ConfigProduto = {
  id: "porta-especial",
  nome: "Porta Encomenda Especial",
  tituloDocumento: "ENCOMENDA ESPECIAL PORTAS",
  prazoEntregaDias: 60,
  campos: [
    { id: "tipoFolha", tipo: "opcao-unica", label: "Tipo", opcoes: ["SÓ FOLHA", "CONJUNTO"], obrigatorio: true },
    { id: "tipoFriso", tipo: "opcao-unica", label: "Tipo de friso", opcoes: ["FRISADA", "RASGADA", "FRISADA E RASGADA"] },
    { id: "modeloFriso", tipo: "texto", label: "Modelo de friso" },
    { id: "alturaFolha", tipo: "medida", unidade: "m", label: "Altura da folha", obrigatorio: true },
    { id: "larguraFolha", tipo: "medida", unidade: "m", label: "Largura da folha", obrigatorio: true },
    { id: "caixaBatente", tipo: "medida", unidade: "m", label: "Caixa do batente" },
    { id: "padraoMadeira", tipo: "texto", label: "Padrão de madeira" },
    { id: "espessuraFolha", tipo: "medida", unidade: "m", label: "Espessura da folha" },
    { id: "medidasGuarnicao", tipo: "medida", unidade: "m", label: "Medidas de guarnição" },
    { id: "ladosGuarnicao", tipo: "opcao-unica", label: "Lados", opcoes: ["UM LADO", "DOIS LADOS"] },
    { id: "tipoAbertura", tipo: "texto", label: "Tipo de abertura" },
    { id: "ladoAbertura", tipo: "texto", label: "Lado de abertura" },
  ],
};
