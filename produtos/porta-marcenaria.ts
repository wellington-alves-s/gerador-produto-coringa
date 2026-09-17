import type { ConfigProduto } from "./tipos";

export const portaMarcenaria: ConfigProduto = {
  id: "porta-marcenaria",
  nome: "Porta Marcenaria Madel",
  tituloDocumento: "ENCOMENDA ESPECIAL PORTAS",
  prazoEntregaDias: 60,
  campos: [
    { id: "tipoFolha", tipo: "multipla-escolha", label: "Tipo", opcoes: ["FRISADA", "RASGADA"] },
    { id: "friso", tipo: "opcao-unica", label: "Friso", opcoes: ["1 LADO", "2 LADOS"] },
    { id: "modeloFriso", tipo: "texto", label: "Modelo de friso" },
    { id: "profundidadeFriso", tipo: "medida", unidade: "m", label: "Profundidade do friso" },
    { id: "cava", tipo: "opcao-unica", label: "Cava", opcoes: ["FOLEADA", "SEM FOLEAR"] },
    { id: "cavaLados", tipo: "opcao-unica", label: "Cava", opcoes: ["1 LADO", "2 LADOS"] },
    { id: "alturaFolha", tipo: "medida", unidade: "m", label: "Altura da folha", obrigatorio: true },
    { id: "larguraFolha", tipo: "medida", unidade: "m", label: "Largura da folha", obrigatorio: true },
    { id: "espessuraFolha", tipo: "opcao-unica", label: "Espessura da folha", opcoes: ["35MM", "45MM"] },
    { id: "madeira", tipo: "opcao-unica", label: "Madeira", opcoes: ["IMBUIA", "CEDRO", "TAUARI"] },
    { id: "ladoMacaneta", tipo: "texto", label: "Lado da maçaneta" },
  ],
};
