// Gera descricoes/<caso>.json com o montador real do app (lib/prompt-imagem.ts), a partir de pedidos simulados.
// Uso (na raiz do projeto): npx tsx laboratorio-imagens/gerar-descricoes.ts
import { writeFileSync } from "node:fs";
import { montarDescricaoImagem } from "../lib/prompt-imagem";
import { ESTADO_INICIAL } from "../lib/pedido";

const base = {
  categoria: "SEMI-PANORÂMICO|VENEZIANA",
  altura: "1100", // medidas em buffer: 1100 = 1,100 m
  largura: "1600",
  caixa: "140",
  padraoMadeira: "Cedrinho",
  medidasGuarnicao: "70",
  ladosGuarnicao: "DOIS LADOS",
  tipoPalheta: "FRANCESA",
  formatoEsquadria: "RETO",
  comSemFerragem: "COM FERRAGENS",
  acabamentoFerragem: "LO",
  tipoAbertura: "CORRER",
  ladoAbertura: "CENTRAL",
  vidros: "FAZER QUANTIDADE E TAMANHOS PROPORCIONAIS ÀS MEDIDAS DA PEÇA",
};

// Para criar um caso novo, adicione uma entrada aqui e rode o script.
const casos: Record<string, { descricao: string; especificacoes: Record<string, string> }> = {
  "4f": {
    descricao:
      "Janela de correr com 4 folhas: 2 folhas venezianas nas extremidades e 2 folhas panorâmicas de vidro no centro",
    especificacoes: {},
  },
  arco: {
    descricao:
      "Janela em arco com bandeira fixa em arco dividida em vidros. Abaixo, 4 folhas: 2 folhas quadriculadas de correr nas extremidades (cada uma com 6 vidros pequenos, 2 colunas por 3 linhas) e 2 folhas venezianas fixas no centro",
    especificacoes: { categoria: "QUADRICULADO|VENEZIANA", formatoEsquadria: "ARCO", altura: "1300", largura: "1500" },
  },
};

for (const [nome, caso] of Object.entries(casos)) {
  const estado = {
    ...ESTADO_INICIAL,
    tipo: "esquadria" as const,
    pedido: { ...ESTADO_INICIAL.pedido, descricao: caso.descricao },
    especificacoes: { ...base, ...caso.especificacoes },
  };
  const arquivo = new URL(`./descricoes/${nome}.json`, import.meta.url);
  writeFileSync(arquivo, JSON.stringify(montarDescricaoImagem(estado), null, 2), "utf8");
  console.log(`descricoes/${nome}.json`);
}
