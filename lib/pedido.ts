import type { TipoProdutoId } from "@/produtos/tipos";
import { DESENHO_INICIAL, type DesenhoEstado } from "./desenho";

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
    notaAdicional: string;
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
    tabelaMadel: boolean;
  };
  /** Posição da imagem e anotações (linhas, setas, textos...) editadas na etapa de Revisão. */
  desenho: DesenhoEstado;
};

export const ESTADO_INICIAL: EstadoPedido = {
  tipo: null,
  ultimaEtapa: "tipo",
  pedido: { cliente: "", numeroPedido: "", data: "", vendedor: "", loja: "", descricao: "", notaAdicional: "" },
  especificacoes: {},
  imagem: { origem: null, bibliotecaId: null, uploadDataUrl: null },
  compra: { fornecedor: "", custo: "", tabelaMadel: false },
  desenho: DESENHO_INICIAL,
};
