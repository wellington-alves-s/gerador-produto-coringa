# Produto Coringa

Gerador de encomendas especiais (croqui) da Madel, reescrito como uma aplicação Next.js sem backend. O usuário percorre um assistente de 5 etapas (tipo do produto, dados do pedido, especificações técnicas, imagem de referência e revisão) e ao final gera um documento de croqui pronto para impressão/exportação, no mesmo layout dos formulários físicos da Madel. Não há login, banco de dados ou API — o único estado persistido é um rascunho em `localStorage`, usado apenas para recuperar uma encomenda não finalizada.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Testes

```bash
npm test
```

Roda a suíte completa (Vitest). Para rodar um arquivo específico: `npx vitest run <caminho>`.

## Adicionando uma foto à biblioteca de produtos

Não existe tela de upload/admin nesta versão — a biblioteca de imagens é alimentada por edição de código:

1. Copie o arquivo de imagem para `public/biblioteca/produtos/`.
2. Adicione uma entrada correspondente em `lib/biblioteca-dados.ts`.
3. Faça commit e push.

## Editando o desenho na Revisão

Na etapa de Revisão há uma barra de ferramentas flutuante para anotar o croqui antes de gerá-lo. Ela nasce no canto superior direito do croqui, fica compacta numa linha, **expande sozinha** quando um item é selecionado (o botão "•••" abre/fecha à mão) e pode ser **movida** para qualquer lugar da janela arrastando a alça à esquerda (ou com as setas do teclado quando a alça está focada):

- **Desenhar:** Linha, Seta, Seta dupla, Texto e Retângulo (clique ou arraste no desenho).
- **Apagar partes da imagem:** **Apagar área** (arraste um retângulo sobre a imagem e confirme com o botão ou Delete; Esc cancela) e **Borracha** quadrada como a do Paint (arraste sobre a imagem; o tamanho é ajustável). Só a imagem do produto é apagada — as anotações você exclui separadamente. Tudo é desfazível (Ctrl+Z) e dá para **Restaurar imagem original**; a imagem de origem nunca é alterada.
- **Selecionar** um item (ou a própria imagem) para **mover** (arrastando ou com as setas do teclado), **esticar/encolher** (alças quadradas), **girar** (alça redonda, campo de rotação ou "Girar 90°"; Shift encaixa de 15° em 15°) e **espelhar** na horizontal ou na vertical.
- **Camadas:** Para frente, Para trás, Ao topo e Ao fundo. **Duplicar**, **Excluir**, cor, espessura, setas, preenchimento e texto na área de opções.
- Atalhos: setas movem (Shift = passo maior) · Delete exclui · Ctrl+D duplica · Ctrl+Z desfaz · Ctrl+Shift+Z (ou Ctrl+Y) refaz · Esc deseleciona.

Ao clicar em **Gerar Croqui**, o resultado já sai consolidado na tela final, pronto para baixar em PDF ou imagem. As anotações ficam salvas no rascunho.

## Geração de imagem por IA (opcional)

Nas etapas de imagem de esquadrias, portas e degrau/patamar/rodapé existe o botão **Gerar imagem**. O prompt é montado em `lib/prompt-imagem.ts` a partir das especificações marcadas e da descrição do pedido (um JSON estruturado), e a geração acontece na rota `app/api/gerar-imagem/route.ts`, que guarda a chave no servidor.

Para ativar: copie `.env.example` para `.env.local`, preencha `GEMINI_API_KEY` (na Vercel, em *Environment Variables*) e, se quiser, `GEMINI_IMAGE_MODEL`. Sem a chave o botão responde "não configurada".

O acesso à rota está livre; o ponto para adicionar limite por IP ou senha é `lib/servidor/protecao.ts`.

## Mais detalhes

O desenho completo da arquitetura e as decisões de escopo estão em
[`docs/superpowers/specs/2026-09-16-refatoracao-nextjs-design.md`](docs/superpowers/specs/2026-09-16-refatoracao-nextjs-design.md).

`legado-php/` contém a versão anterior (PHP), aposentada e mantida apenas como referência histórica.
