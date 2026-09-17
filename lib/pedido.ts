import type { TipoProdutoId } from "@/produtos/tipos";

export type EtapaId = "tipo" | "pedido" | "especificacoes" | "imagem" | "revisao";

export type EstadoPedido = {
  tipo: TipoProdutoId | null;
  ultimaEtapa: EtapaId;
  pedido: {
    cliente: string;
    numeroPedido: string;
    data: string;
    vendedor: string;
    loja: string;
    descricao: string;
  };
  especificacoes: Record<string, string>;
  imagem: {
    origem: "biblioteca" | "upload" | null;
    bibliotecaId: string | null;
    uploadDataUrl: string | null;
  };
  compra: {
    fornecedor: string;
    custo: string;
  };
};

export const ESTADO_INICIAL: EstadoPedido = {
  tipo: null,
  ultimaEtapa: "tipo",
  pedido: { cliente: "", numeroPedido: "", data: "", vendedor: "", loja: "", descricao: "" },
  especificacoes: {},
  imagem: { origem: null, bibliotecaId: null, uploadDataUrl: null },
  compra: { fornecedor: "", custo: "" },
};
