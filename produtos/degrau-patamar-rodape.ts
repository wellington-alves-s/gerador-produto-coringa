import type { ConfigProduto } from "./tipos";

export const degrauPatamarRodape: ConfigProduto = {
  id: "degrau-patamar-rodape",
  nome: "Degrau / Patamar / Rodapé",
  tituloDocumento: "ENCOMENDA ESPECIAL DEGRAU/PATAMAR/RODAPÉ",
  permiteGerarImagem: true,
  prazoEntregaDias: 60,
  // A régua horizontal (embaixo do desenho) mostra o comprimento da peça, e a
  // vertical (do lado) mostra a largura — orientação física invertida em
  // relação aos outros produtos, por causa do formato comprido do degrau.
  campoLargura: "comprimento",
  campoAltura: "largura",
  rotuloCampoLargura: "Comprimento",
  rotuloCampoAltura: "Largura",
  campos: [
    {
      id: "tipoPeca",
      tipo: "opcao-unica",
      label: "Peça",
      opcoes: ["DEGRAU", "PATAMAR", "RODAPÉ"],
      obrigatorio: true,
    },
    { id: "largura", tipo: "medida", unidade: "m", label: "Largura", obrigatorio: true },
    { id: "comprimento", tipo: "medida", unidade: "m", label: "Comprimento", obrigatorio: true },
    { id: "espessura", tipo: "medida", unidade: "cm", casasDecimais: 1, label: "Espessura", obrigatorio: true },
    { id: "tipoMadeira", tipo: "texto", label: "Tipo de madeira", obrigatorio: true },
  ],
};
