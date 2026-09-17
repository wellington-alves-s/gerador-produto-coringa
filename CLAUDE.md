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
- **Documento final**: `components/croqui/DocumentoCroqui.tsx` reproduz o layout dos formulários físicos da Madel; é usado tanto no preview da Revisão quanto na tela de Resultado. Exportação em `lib/exportar-pdf.ts` / `lib/exportar-imagem.ts` (html2canvas + jsPDF), disparada por dois botões independentes.
- **Sem backend**: nenhuma rota de API, banco de dados, login ou persistência de pedidos nesta v1 — só o rascunho único em `localStorage`. Ver `docs/superpowers/specs/2026-09-16-refatoracao-nextjs-design.md` para o desenho completo e o que fica para fases futuras.

## Convenções

- Nomes de variáveis, funções e componentes em português (refletindo o domínio do negócio), como no restante do projeto.
- Toda medida usa o padrão brasileiro de formatação (`0,000`, vírgula decimal) via `lib/formatacao.ts` — nunca formatar número diretamente num componente.
- `DocumentoCroqui` nunca reage ao tema claro/escuro da interface — sempre renderiza com a paleta fixa vermelho/branco/grafite da Madel.
