import type { ConfigProduto } from "./tipos";

export const outros: ConfigProduto = {
  id: "outros",
  nome: "Outros (EX: Folhas de janela, ferragens, kits)",
  tituloDocumento: "ENCOMENDA ESPECIAL",
  prazoEntregaDias: 60,
  campoLargura: "largura",
  campoAltura: "altura",
  campos: [
    { id: "detalhes", tipo: "texto", label: "Detalhes" },
    { id: "altura", tipo: "medida", unidade: "m", label: "Altura" },
    { id: "largura", tipo: "medida", unidade: "m", label: "Largura" },
  ],
};
