export type TipoProdutoId =
  | "porta-marcenaria"
  | "porta-especial"
  | "porta-acm"
  | "esquadria"
  | "degrau-patamar-rodape"
  | "outros";

export type CampoBase = {
  id: string;
  label: string;
  obrigatorio?: boolean;
};

export type CampoMedida = CampoBase & { tipo: "medida"; unidade: "m" | "mm" };
export type CampoTexto = CampoBase & { tipo: "texto" };
export type CampoOpcaoUnica = CampoBase & { tipo: "opcao-unica"; opcoes: string[] };
export type CampoMultiplaEscolha = CampoBase & { tipo: "multipla-escolha"; opcoes: string[] };

export type Campo = CampoMedida | CampoTexto | CampoOpcaoUnica | CampoMultiplaEscolha;

export type ConfigProduto = {
  id: TipoProdutoId;
  nome: string;
  tituloDocumento: string;
  prazoEntregaDias: number;
  campos: Campo[];
};
