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
  /** Campos com o mesmo número de linha aparecem lado a lado no documento impresso. */
  linha?: number;
  /** Torna este campo obrigatório somente quando o campo `campoId` tiver um dos `valores`. */
  dependeDe?: { campoId: string; valores: string[] };
  /** Omite o label deste campo no documento impresso (ex.: continuação de outro campo com o mesmo label). */
  ocultarLabelDocumento?: boolean;
  /**
   * No documento impresso, mostra só as opções marcadas (ex.: "Categoria:
   * Quadriculado, Veneziana") em vez da lista completa com ☑/☐. Útil pra
   * campos com muitas opções, onde listar todas polui visualmente.
   */
  exibirApenasSelecionadas?: boolean;
};

export type CampoMedida = CampoBase & {
  tipo: "medida";
  unidade: "m" | "mm" | "cm";
  casasDecimais?: number;
  /** Quantidade de dígitos antes da vírgula (padrão 1). Aumente para medidas com dezenas, ex.: 14,0 cm. */
  casasInteiras?: number;
};
export type CampoTexto = CampoBase & { tipo: "texto" };
export type CampoOpcaoUnica = CampoBase & { tipo: "opcao-unica"; opcoes: string[] };
export type CampoMultiplaEscolha = CampoBase & {
  tipo: "multipla-escolha";
  opcoes: string[];
  /**
   * Grupos de opções mutuamente excludentes: marcar uma desmarca as outras do
   * mesmo grupo automaticamente. Opções fora de qualquer grupo continuam
   * livres para combinar com qualquer outra.
   */
  gruposExcludentes?: string[][];
};

export type Campo = CampoMedida | CampoTexto | CampoOpcaoUnica | CampoMultiplaEscolha;

export type ConfigProduto = {
  id: TipoProdutoId;
  nome: string;
  tituloDocumento: string;
  prazoEntregaDias: number;
  campos: Campo[];
  /** Id do campo (em `campos`) usado na régua horizontal (embaixo do desenho). */
  campoLargura?: string;
  /** Id do campo (em `campos`) usado na régua vertical (do lado do desenho). */
  campoAltura?: string;
  /** Palavra mostrada na régua horizontal (padrão "Largura"). Útil quando a orientação física da peça não é largura, ex.: "Comprimento". */
  rotuloCampoLargura?: string;
  /** Palavra mostrada na régua vertical (padrão "Altura"). Útil quando a orientação física da peça não é altura, ex.: "Largura". */
  rotuloCampoAltura?: string;
  /** Habilita o botão "Gerar imagem" (IA) na etapa de imagem para este tipo. */
  permiteGerarImagem?: boolean;
};
