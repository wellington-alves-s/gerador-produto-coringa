# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é este projeto

Produto Coringa — gerador de encomendas especiais (croqui) da Madel, reescrito como uma aplicação Next.js sem backend (v1). O sistema PHP anterior foi movido para `legado-php/` e mantido só como referência histórica (ver `legado-php/CLAUDE.md` e `legado-php/DOCUMENTACAO.md`); não é mais executado.

## Comandos

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção (usado também como verificação de tipos/erros)
- `npm test` — roda toda a suíte de testes (Vitest)
- `npx vitest run <caminho>` — roda um arquivo de teste específico
- `node scripts/migrar-biblioteca.mjs` — script único de bootstrap que migrou as fotos de `legado-php/uploads/`; não precisa rodar de novo. Para adicionar uma nova foto à biblioteca, copie o arquivo para `public/biblioteca/produtos/` e adicione uma entrada em `lib/biblioteca-dados.ts` manualmente.

## Arquitetura

- **Motor de produtos** (`produtos/`): um arquivo por tipo de croqui (`porta-marcenaria.ts`, `porta-especial.ts`, `porta-acm.ts`, `esquadria.ts`, `degrau-patamar-rodape.ts`, `outros.ts`), cada um exportando uma `ConfigProduto` com seus campos. Essa mesma config alimenta o formulário dinâmico (Etapa 3) e a seção de especificações do documento gerado — mudar um campo é editar um lugar só.
- **Wizard** (`app/criar/*`): 5 rotas (`tipo`, `pedido`, `especificacoes`, `imagem`, `revisao`) + `resultado`. Estado central em `lib/wizard-context.tsx` (Context + reducer), tipado em `lib/pedido.ts`, espelhado em `localStorage` por `lib/wizard-storage.ts` a cada mudança — permite recuperar um rascunho não finalizado.
- **Biblioteca de imagens**: `lib/biblioteca-dados.ts` (manifesto) + `public/biblioteca/produtos/` (arquivos). Alimentada só via edição de código + deploy — não existe tela de upload/admin nesta v1.
- **Desenho editável** (Revisão): `lib/desenho.ts` (modelo + matemática: mover, redimensionar por alça com lado oposto fixo, girar, espelhar, camadas, histórico), `components/croqui/EditorDesenho.tsx` (conteúdo da barra de ferramentas, atalhos, desfazer/refazer) dentro de `components/ui/BarraFlutuante.tsx` (painel `fixed`, arrastável, que expande/recolhe) com ícones em `components/ui/Icones.tsx`, `OverlayEdicao.tsx` (camada SVG interativa) e `AreaDesenho.tsx` + `ElementosDesenho.tsx` (renderização estática, usada também no Resultado e na exportação). Todas as coordenadas ficam num espaço lógico fixo de 1000×800, então o desenho escala igual na tela e nas exportações. O estado fica em `EstadoPedido.desenho` (`elementos` + posição da imagem) e é salvo no rascunho; trocar o tipo do produto o descarta. A edição só existe na Revisão; o Resultado exibe o desenho já consolidado.
- **Documento final**: `components/croqui/DocumentoCroqui.tsx` reproduz o layout dos formulários físicos da Madel; é usado tanto no preview da Revisão quanto na tela de Resultado. Exportação em `lib/exportar-pdf.ts` / `lib/exportar-imagem.ts` (html2canvas + jsPDF), disparada por dois botões independentes.
- **Backend mínimo**: a única rota de servidor é `app/api/gerar-imagem/route.ts` (geração de imagem por IA, chave `GEMINI_API_KEY`; ver README). O prompt é montado em `lib/prompt-imagem.ts` e o provedor fica em `lib/servidor/gemini.ts`; a proteção por IP/senha (hoje livre) entra em `lib/servidor/protecao.ts`. Fora isso, não há banco de dados, login nem persistência de pedidos — só o rascunho único em `localStorage`. Ver `docs/superpowers/specs/2026-09-16-refatoracao-nextjs-design.md` para o desenho completo e o que fica para fases futuras.

## Convenções

- Nomes de variáveis, funções e componentes em português (refletindo o domínio do negócio), como no restante do projeto.
- Toda medida usa o padrão brasileiro de formatação (`0,000`, vírgula decimal) via `lib/formatacao.ts` — nunca formatar número diretamente num componente.
- No desenho editável, o `html2canvas` só exporta bem anotações em SVG (texto, linhas, setas e retângulos) e a imagem como `<img>` posicionado em %; evite `position: absolute` com `right`/`bottom`/`calc()` e HTML dentro de `foreignObject`.
- `DocumentoCroqui` nunca reage ao tema claro/escuro da interface — sempre renderiza com a paleta fixa vermelho/branco/grafite da Madel.
