import type { ConfigProduto } from "./tipos";

export const portaAcm: ConfigProduto = {
  id: "porta-acm",
  nome: "Porta de ACM",
  tituloDocumento: "ENCOMENDA ESPECIAL PORTAS ACM",
  prazoEntregaDias: 90,
  campos: [
    { id: "tipoFolha", tipo: "opcao-unica", label: "Tipo", opcoes: ["SÓ FOLHA", "CONJUNTO"], obrigatorio: true },
    { id: "tipoFerragemFechadura", tipo: "texto", label: "Tipo de ferragem e fechadura" },
    { id: "alturaFolha", tipo: "medida", unidade: "m", label: "Altura da folha", obrigatorio: true },
    { id: "larguraFolha", tipo: "medida", unidade: "m", label: "Largura da folha", obrigatorio: true },
    { id: "caixaBatente", tipo: "medida", unidade: "m", label: "Caixa do batente" },
    { id: "corAcm", tipo: "texto", label: "Cor do ACM" },
    { id: "espessuraFolha", tipo: "medida", unidade: "m", label: "Espessura da folha" },
    { id: "medidasGuarnicao", tipo: "medida", unidade: "m", label: "Medidas de guarnição" },
    { id: "ladosGuarnicao", tipo: "opcao-unica", label: "Lados", opcoes: ["UM LADO", "DOIS LADOS"] },
    { id: "tipoAbertura", tipo: "texto", label: "Tipo de abertura" },
    { id: "ladoAbertura", tipo: "texto", label: "Lado de abertura" },
  ],
};
