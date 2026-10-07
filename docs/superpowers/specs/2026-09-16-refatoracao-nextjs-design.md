# Produto Coringa — Reescrita v1 (Next.js, sem backend)

Status: aprovado para virar plano de implementação
Data: 2026-09-16
Sub-projeto: primeira entrega de uma reescrita maior (ver "Fora de escopo" para o que fica para depois)

## 1. Contexto e motivação

O sistema atual (`index.html` + `croqui.php` + PHP puro, documentado em `CLAUDE.md` e `DOCUMENTACAO.md`) gera a folha de "Encomenda Especial" usada pela equipe de vendas da Madel. Os problemas centrais que motivam a reescrita:

- A lógica de campos por tipo de produto está duplicada em dois lugares (`js/form.js` e `croqui.php`) e diverge com o tempo.
- O formulário mostra todos os campos de uma vez, difícil para quem não conhece o processo.
- PHP não roda de forma nativa na Vercel, que é o destino de hospedagem desejado (com possibilidade futura de mover para uma instância Oracle Cloud).
- Os formulários realmente usados hoje em campo (enviados pelo usuário como referência: Porta Marcenaria Madel, Porta Encomenda Especial, Porta ACM, Esquadrias) já divergem do que o PHP atual implementa — o PHP ficou desatualizado.

Este documento cobre **apenas a primeira entrega**: reescrever o fluxo atual como um wizard em Next.js, publicável na Vercel, sem login e sem persistência de pedidos. Login, histórico de pedidos e administração da biblioteca de imagens por tela própria ficam para uma fase futura (seção 12).

## 2. Escopo desta v1

**Entra:**
- Wizard de 5 etapas (Tipo → Pedido → Especificações → Imagem → Revisão) + tela de Resultado.
- 6 tipos de croqui: Porta Marcenaria Madel, Porta Encomenda Especial, Porta de ACM, Esquadrias Encomenda, Degrau/Patamar/Rodapé, Outros.
- Rascunho automático no navegador (localStorage), com opção de continuar de onde parou.
- Biblioteca de imagens de produtos, alimentada por você (administrador) via git — sem tela de upload/admin.
- Upload de imagem avulsa por geração, que não é salva em lugar nenhum além daquele documento.
- Geração do documento final com o mesmo layout visual dos formulários físicos da Madel (vermelho/branco/grafite), com dois botões de exportação: **Baixar PDF** e **Baixar Imagem**.
- Campos opcionais de Fornecedor e Custo (para a versão "uso interno"), permitindo gerar duas versões do mesmo pedido (uma para aprovação do cliente, outra para compras).
- Tema claro/escuro só na interface do app (o documento gerado é sempre no visual fixo da Madel).

**Não entra nesta v1 (ver seção 12):**
- Login / autenticação.
- Persistência de pedidos, histórico, "minhas encomendas", duplicar pedido.
- Tela de administração para alimentar a biblioteca de imagens (usa-se git/deploy).
- Campos comerciais do sistema atual: Preço, Quantidade, Unidade, Montagem, Grupo de Serviço — removidos, pois não existem nos formulários físicos reais usados hoje.
- Banco de dados ou storage externo (Supabase, Cloudinary etc.).

## 3. Arquitetura geral

```
┌─────────────────────────────────────────┐
│              Vercel (deploy)             │
│  ┌─────────────────────────────────────┐ │
│  │         Next.js (App Router)         │ │
│  │  React + TypeScript + Tailwind CSS   │ │
│  │                                       │ │
│  │  Sem banco, sem API externa,         │ │
│  │  sem autenticação                    │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

- Nenhum backend: o servidor do Next.js só serve os arquivos estáticos/JS, sem rota de API que armazene dado nenhum.
- Biblioteca de imagens = arquivos dentro do próprio repositório (`public/biblioteca/produtos/...`) + manifesto (`lib/biblioteca-dados.ts`). Adicionar uma imagem = adicionar arquivo + linha no manifesto + `git push` (a Vercel republica sozinha).
- Imagem avulsa de uma geração específica nunca sai do navegador (mantida via `URL.createObjectURL`/base64 em memória e no rascunho local).
- Rascunho do formulário: espelhado em `localStorage` a cada mudança.
- Geração do documento: 100% no navegador (`html2canvas` + `jsPDF`), sem chamada a servidor.

Consequência prática: esta v1 pode ser publicada como aplicação totalmente estática/client-side. Funciona na Vercel hoje e, se no futuro for hospedada numa instância Oracle Cloud, basta rodar `next start` (ou servir uma build estática) sem alterar nenhuma lógica — não há nenhuma peça vendor-locked (sem Supabase, sem serviço externo).

## 4. Estrutura de pastas

```
produto-coringa/
├── app/
│   ├── layout.tsx                 tema claro/escuro, header, fontes
│   ├── page.tsx                    tela inicial ("Nova encomenda")
│   ├── criar/
│   │   ├── layout.tsx               contexto do wizard + barra de progresso
│   │   ├── tipo/page.tsx             Etapa 1 — escolher o tipo
│   │   ├── pedido/page.tsx           Etapa 2 — cliente/pedido/vendedor/loja/data/descrição
│   │   ├── especificacoes/page.tsx   Etapa 3 — campos dinâmicos por tipo
│   │   ├── imagem/page.tsx           Etapa 4 — biblioteca ou upload avulso
│   │   ├── revisao/page.tsx          Etapa 5 — conferir tudo + fornecedor/custo opcionais
│   │   └── resultado/page.tsx        documento final + Baixar PDF / Baixar Imagem
│
├── produtos/                      ← o "motor de produtos"
│   ├── tipos.ts                    tipos compartilhados (Campo, ConfigProduto)
│   ├── porta-marcenaria.ts
│   ├── porta-especial.ts
│   ├── porta-acm.ts
│   ├── esquadria.ts
│   ├── degrau-patamar-rodape.ts
│   ├── outros.ts
│   └── index.ts                    registro: id do tipo → config
│
├── components/
│   ├── wizard/                     navegação, indicador de etapas
│   ├── forms/                      inputs reutilizáveis (medida, seleção, checkbox-group)
│   ├── croqui/                     DocumentoCroqui.tsx + botões de exportar
│   └── ui/                         botão, card, etc.
│
├── lib/
│   ├── wizard-context.tsx          estado do wizard + espelhamento no localStorage
│   ├── formatacao.ts               máscara de medida em metros (pt-BR)
│   ├── imagem.ts                    compressão/redimensionamento client-side
│   ├── exportar-pdf.ts             wrapper do jsPDF
│   └── exportar-imagem.ts          wrapper do html2canvas
│
├── public/
│   ├── biblioteca/produtos/...     fotos da biblioteca (adicionadas via git)
│   └── marca/                      logo-madel.png / selo-qualidade.png
│
├── lib/biblioteca-dados.ts         manifesto: id, nome, categoria, arquivo
├── package.json / tsconfig.json (Tailwind v4: sem tailwind.config)
```

## 5. O motor de produtos

Cada tipo é um arquivo de configuração TypeScript que descreve seus campos, em vez de lógica espalhada por múltiplos arquivos:

```typescript
// produtos/tipos.ts
type CampoBase = { id: string; label: string; obrigatorio?: boolean };
type Campo =
  | (CampoBase & { tipo: "medida"; unidade: "m" | "mm" | "cm"; casasDecimais?: number; casasInteiras?: number })
  | (CampoBase & { tipo: "texto" })
  | (CampoBase & { tipo: "opcao-unica"; opcoes: string[] })
  | (CampoBase & { tipo: "multipla-escolha"; opcoes: string[] });

type ConfigProduto = {
  id: string;
  nome: string;                 // usado no título do documento
  prazoEntregaDias: number;     // impresso no "Aviso ao Cliente"
  campos: Campo[];              // Etapa 3 + seção "Especificações Técnicas" do croqui
};
```

Essa lista de campos alimenta três coisas ao mesmo tempo: o formulário da Etapa 3 (renderizado genericamente, sem componente feito à mão por tipo), a validação (`obrigatorio`) e a seção de especificações do documento impresso, na mesma ordem declarada.

### 5.1 Configuração de cada tipo

> **Fonte da verdade: `produtos/*.ts`.** As tabelas abaixo são o desenho inicial e já divergem do código. Principais diferenças atuais:
> - Campos de medida aceitam `cm`, `casasDecimais` e `casasInteiras`; caixa do batente, espessura da folha e medidas de guarnição são em cm (1 casa decimal) nas portas especial/ACM e na esquadria.
> - Campos têm `linha` (lado a lado no documento), `dependeDe` (obrigatório só quando outro campo tem certo valor), `exibirApenasSelecionadas` e `ocultarLabelDocumento`.
> - Porta Marcenaria: madeira e espessura (35MM/45MM) são obrigatórias; `ladoMaçaneta` é `ladoMacaneta`; `profundidadeFriso` é em cm.
> - Porta Especial: sem `tipoFriso`/`modeloFriso`; `padraoMadeira` e `espessuraFolha` obrigatórios; abertura e lado são opção única (GIRO/PIVOTANTE/CAMARÃO e ESQUERDO/DIREITO/CENTRAL), exigidos só quando Tipo é CONJUNTO.
> - Esquadria: tem `categoria` (múltipla escolha com grupo excludente), `formatoEsquadria` (em vez de `formatoPalheta`), `tipoPalheta`, `acabamentoFerragem` e opções de abertura em opção única; `vidros` depende de `categoria`.
> - Régua do desenho: `campoLargura`/`campoAltura` (e rótulos) definem os campos usados; no Degrau/Patamar/Rodapé a horizontal mostra Comprimento e a vertical Largura.

**`porta-marcenaria`** — "Porta Marcenaria Madel" — título do documento `ENCOMENDA ESPECIAL PORTAS` — prazo **60 dias**

| id | tipo | opções / unidade | obrigatório |
|---|---|---|---|
| tipoFolha | multipla-escolha | FRISADA, RASGADA | |
| friso | opcao-unica | 1 LADO, 2 LADOS | |
| modeloFriso | texto | | |
| profundidadeFriso | medida | m | |
| cava | opcao-unica | FOLEADA, SEM FOLEAR | |
| cavaLados | opcao-unica | 1 LADO, 2 LADOS | |
| alturaFolha | medida | m | sim |
| larguraFolha | medida | m | sim |
| espessuraFolha | opcao-unica | 35MM, 45MM | |
| madeira | opcao-unica | IMBUIA, CEDRO, TAUARI | |
| ladoMaçaneta | texto | | |

**`porta-especial`** — "Porta Encomenda Especial" — título `ENCOMENDA ESPECIAL PORTAS` — prazo **60 dias**

| id | tipo | opções / unidade | obrigatório |
|---|---|---|---|
| tipoFolha | opcao-unica | SÓ FOLHA, CONJUNTO | sim |
| tipoFriso | opcao-unica | FRISADA, RASGADA, FRISADA E RASGADA | |
| modeloFriso | texto | | |
| alturaFolha | medida | m | sim |
| larguraFolha | medida | m | sim |
| caixaBatente | medida | m | |
| padraoMadeira | texto | | |
| espessuraFolha | medida | m | |
| medidasGuarnicao | medida | m | |
| ladosGuarnicao | opcao-unica | UM LADO, DOIS LADOS | |
| tipoAbertura | texto | | |
| ladoAbertura | texto | | |

**`porta-acm`** — "Porta de ACM" — título `ENCOMENDA ESPECIAL PORTAS ACM` — prazo **90 dias**

| id | tipo | opções / unidade | obrigatório |
|---|---|---|---|
| tipoFolha | opcao-unica | SÓ FOLHA, CONJUNTO | sim |
| tipoFerragemFechadura | texto | | |
| alturaFolha | medida | m | sim |
| larguraFolha | medida | m | sim |
| caixaBatente | medida | m | |
| corAcm | texto | | |
| espessuraFolha | medida | m | |
| medidasGuarnicao | medida | m | |
| ladosGuarnicao | opcao-unica | UM LADO, DOIS LADOS | |
| tipoAbertura | texto | | |
| ladoAbertura | texto | | |

**`esquadria`** — "Esquadrias Encomenda" — título `ENCOMENDA ESPECIAL ESQUADRIAS` — prazo **60 dias**

| id | tipo | opções / unidade | obrigatório |
|---|---|---|---|
| altura | medida | m | sim |
| largura | medida | m | sim |
| caixa | medida | m | |
| padraoMadeira | texto | | |
| medidasGuarnicao | medida | m | |
| ladosGuarnicao | opcao-unica | UM LADO, DOIS LADOS | |
| tipoPalheta | texto | | |
| formatoPalheta | opcao-unica | RETO, ARCO | |
| acabamentoFerragem | texto | | |
| comSemFerragem | opcao-unica | COM FERRAGENS, SEM FERRAGENS | |
| tipoAbertura | texto | | |
| ladoAbertura | texto | | |
| vidros | opcao-unica | CONSIDERAR QUANTIDADE DE VIDROS DO DESENHO, FAZER QUANTIDADE E TAMANHOS PROPORCIONAIS ÀS MEDIDAS DA PEÇA, QUANTIDADES E TAMANHOS A CRITÉRIO DA FÁBRICA | |

**`degrau-patamar-rodape`** — "Degrau / Patamar / Rodapé" — título `ENCOMENDA ESPECIAL DEGRAU/PATAMAR/RODAPÉ` — prazo **60 dias** (assumido; não há formulário físico de referência)

| id | tipo | opções / unidade | obrigatório |
|---|---|---|---|
| largura | medida | m | sim |
| comprimento | medida | m | sim |
| espessura | medida | m | sim |
| tipoMadeira | texto | | sim |

**`outros`** — "Outros" — título `ENCOMENDA ESPECIAL` — prazo **60 dias** (assumido)

Campos opcionais: Detalhes (texto), Altura e Largura (medida, m). A Etapa 3 é exibida e pode ser avançada sem preencher nada; Altura e Largura, quando preenchidas, alimentam as réguas do desenho.

> Nota: os prazos de 60/90 dias e os títulos de "Degrau/Patamar/Rodapé" e "Outros" foram inferidos por analogia aos formulários enviados (que não cobrem esses dois tipos). Vale confirmar na prática antes ou logo depois da primeira entrega.

## 6. Wizard — etapas, navegação e estado

- Cada etapa é uma rota própria (`/criar/tipo`, `/criar/pedido`, ...), com um `WizardContext` (React Context) guardando o estado inteiro do pedido em andamento.
- Etapa 2 (Pedido) coleta: Cliente, Nº Pedido, Data, Vendedor, Loja, Descrição do Produto — comuns a todos os tipos.
- Etapa 3 (Especificações) é gerada dinamicamente a partir de `campos` do tipo escolhido (para "Outros" todos os campos são opcionais).
- Etapa 4 (Imagem): biblioteca (grade + busca, lida do manifesto estático) ou upload avulso (comprimido no navegador, ver seção 7).
- Etapa 5 (Revisão): mostra tudo, incluindo o preview do `DocumentoCroqui`, e tem uma seção opcional "Informações de compra" com **Fornecedor** e **Custo** (ambos opcionais).
- Tela de Resultado: exibe o documento final e os botões **Baixar PDF** / **Baixar Imagem**.
- Validação: campos com `obrigatorio: true` bloqueiam o avanço com erro inline (substitui os `alert()` do sistema atual).

### Rascunho e recuperação

- A cada mudança (com debounce), o estado inteiro do wizard — incluindo a imagem avulsa já comprimida — é gravado numa única chave do `localStorage`.
- Ao abrir `/criar`, se houver rascunho salvo, aparece: *"Encontramos uma encomenda não finalizada. Deseja continuar?"* com opções **Continuar** / **Começar nova**.
- O rascunho não é apagado automaticamente ao gerar o documento — permite voltar à Revisão, preencher Fornecedor/Custo e gerar a segunda versão. Só é descartado ao escolher explicitamente "Começar nova encomenda".
- Rascunho único (não uma lista/histórico), coerente com a decisão de não persistir pedidos.

## 7. Biblioteca de imagens e upload avulso

- `lib/biblioteca-dados.ts`: lista de `{ id, nome, categoria, arquivo }` (tipo em `lib/biblioteca-tipos.ts`). Lido em build time (import direto, sem fetch).
- Etapa 4 reproduz a UX de busca + grade da `biblioteca_imagens.php` atual, mas embutida no wizard (sem popup).
- Migração: as imagens hoje em `uploads/` são movidas para `public/biblioteca/produtos/` e o manifesto inicial é gerado a partir delas, como parte da implementação (não faz parte do desenho da arquitetura em si).
- Upload avulso: ao escolher um arquivo, ele é redimensionado/comprimido no navegador (canvas, ~1600px de largura, JPEG) antes de ser usado — mantém o export leve e permite guardar essa imagem como parte do rascunho em `localStorage` sem estourar a cota de armazenamento do navegador.

## 8. Documento gerado (croqui)

Um único componente (`components/croqui/DocumentoCroqui.tsx`) reproduz o layout dos formulários físicos da Madel, parametrizado pelo tipo escolhido:

```
┌─────────────────────────────────────────────┬───────────────────┐
│ <título do tipo>                    (barra vermelha)             │
├───────────────────────────────────────────────────────────────  │
│ Cliente / Nº Pedido / Data / Vendedor / Loja                    │
│ Descrição do Produto                                             │
│ ─────────────────────────────────────────────                   │
│ [ especificações técnicas — geradas a partir de "campos" do      │
│   tipo escolhido, na ordem declarada na configuração ]           │
│ ─────────────────────────────────────────────                   │
│ AVISO AO CLIENTE (+ prazo de entrega do tipo)                    │  │  DESENHO DA
│ Assinatura do Cliente / Assinatura do Gerente + Data              │  │  PEÇA ESPECIAL
│ Logo Madel + Selo "Sob Medida"                                   │  │  (grade + imagem
├───────────────────────────────────────────────────────────────  │   escolhida, com
│ USO INTERNO PARA COMPRAS — Fornecedor / Custo (linha em branco  │  │  largura/altura)
│ se não preenchidos)                                              │  │
└───────────────────────────────────────────────────────────────┴───────────────────┘
```

Esse mesmo componente é usado no preview da Revisão e na tela de Resultado. Gerar a "versão para aprovação do cliente" (sem Fornecedor/Custo) e depois a "versão para compras" (com Fornecedor/Custo) é apenas preencher esses dois campos opcionais e clicar em Baixar de novo — sem tela ou lógica extra.

## 9. Exportação

- **Baixar PDF** e **Baixar Imagem** são dois botões distintos (não uma escolha combinada).
- Ambos capturam o `DocumentoCroqui` já renderizado via `html2canvas`; o PDF usa `jsPDF` para embutir o canvas resultante, igual ao comportamento de hoje — só que as bibliotecas vêm via `npm`, não CDN.
- Falha na geração mostra uma mensagem de erro na tela (hoje só loga no console).

## 10. Tema claro/escuro

- Aplicado apenas à interface do wizard (botão sol/lua no cabeçalho), via `class` strategy do Tailwind. Preferência salva em chave própria do `localStorage`, separada do rascunho do pedido.
- O `DocumentoCroqui` ignora completamente o tema do app: sempre renderiza com a paleta fixa vermelho/branco/grafite da Madel, pois é o que é impresso/exportado.

## 11. Testes

- **Vitest** para os arquivos de `produtos/*.ts` (garantir que cada config está bem formada) e para `lib/formatacao.ts` (a máscara de medida em pt-BR já foi fonte de bugs no sistema atual).
- **React Testing Library** para o fluxo do wizard (avançar/voltar etapas, validação bloqueando avanço) e para conferir que `DocumentoCroqui` renderiza os campos certos por tipo.
- Sem E2E nesta v1.

## 12. Fora de escopo (fases futuras)

Conforme o rascunho original (`nova arquitetura.md`) e as decisões desta rodada, ficam para depois:

- Login e contas de usuário.
- Persistência de pedidos em banco (Supabase/Postgres ou outro), histórico "minhas encomendas", duplicar/editar pedido salvo.
- Tela de administração para alimentar a biblioteca de imagens sem precisar mexer em código/git.
- Reavaliação de custo de infraestrutura quando/se essas fases exigirem banco ou storage externo.

## 13. Deploy e portabilidade

- **Vercel**: conectar o repositório, sem configuração adicional — suporte de primeira classe a Next.js.
- Nenhuma variável de ambiente ou segredo necessário nesta v1.
- Por não depender de nenhuma parte server-side com estado (sem rota de API, sem banco), o mesmo build funciona rodando `next start` num Node qualquer — incluindo uma instância Oracle Cloud no futuro, sem alterar a lógica da aplicação.
