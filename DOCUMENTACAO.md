# Produto Coringa — Documentação Técnica

Gerador de encomendas especiais (croqui) da Madel: como o projeto está organizado, o que cada arquivo faz e o que rodar primeiro se algo quebrar.

## 1. Visão geral

**Produto Coringa** é uma ferramenta interna usada pela equipe de vendas da Madel (loja de portas, esquadrias e acabamentos de madeira) para gerar a folha de *encomenda especial*: o documento técnico que descreve um produto sob medida — porta, esquadria, batente, guarnição, degrau, kit de correr etc. — para ser assinado pelo cliente e usado internamente pelo setor de compras.

Não existe build, empacotador, framework ou banco de dados. É PHP puro renderizando HTML no servidor, combinado com JavaScript vanilla no navegador. Toda a persistência de dados é o diretório `uploads/` — não há tabela, arquivo de configuração ou serviço externo além disso.

## 2. Rodando localmente

Qualquer servidor com PHP habilitado funciona (Apache/XAMPP ou o servidor embutido do PHP):

```
php -S localhost:8000
# depois abrir http://localhost:8000/index.html
```

Formatação de código usa as regras de `.prettierrc` (tabs, 100 colunas, aspas duplas). Como não há `package.json`, rode via `npx prettier --write .` ou um Prettier instalado globalmente.

## 3. Fluxo de dados

Só um caminho está de fato conectado ponta a ponta. Os demais arquivos existem no repositório mas não são alcançados a partir dele — nem entre si.

```
index.html ──POST multipart──▶ croqui.php ──renderiza──▶ html2canvas + jsPDF (CDN)
    │                                │                        (export PDF / PNG)
    │ controlado por                 │
    ▼                                ▼
js/form.js                     salva upload novo
    │                                │
    │ abre popup                     ▼
    ▼                           uploads/
biblioteca_imagens.php ──window.opener──▶ index.html
    │
    └── lista arquivos de uploads/

────────────────── código legado / desconectado do fluxo acima ──────────────────

processar.php ──grava $_SESSION──✕──▶ croqui.php   (croqui.php nunca lê $_SESSION)

croqui.html + js/croqui.js        (exemplo estático fixo, não linkado)

print.html                        (espera ?img= na URL, nada o chama)
```

O único jeito de gerar uma encomenda hoje é preencher `index.html` e enviar o formulário — ele vai direto para `croqui.php`. Os três blocos da seção "legado" existem no repositório, mas nenhum é alcançado por esse caminho.

## 4. Estrutura de arquivos

```
gerador-produto-coringa/
├── index.html                formulário — ponto de entrada real
├── croqui.php                 gera o documento a partir do POST
├── biblioteca_imagens.php     popup de seleção de imagens
├── processar.php              fluxo alternativo via sessão — desconectado
├── croqui.html                exemplo estático — desconectado
├── print.html                 helper de impressão — não usado por nada
├── js/
│   ├── form.js                lógica de index.html
│   └── croqui.js              só usado por croqui.html
├── css/
│   ├── croqui.css             estilos de index.html e croqui.html
│   └── style.css              órfão — nenhum HTML o referencia
├── uploads/                   fotos de produto (upload + biblioteca)
├── madel-logo.png
├── madel-selo.png
└── .prettierrc
```

### Fluxo real

| Arquivo | Papel |
|---|---|
| `index.html` | Formulário de pedido. Um único `<select name="tipo">` decide quais blocos de campo aparecem: PORTA, ESQUADRIA, BATENTE, GUARNIÇÃO, DEGRAU, PATAMAR, RODAPÉ, FECHADURA, PUXADOR, KIT DE CORRER. Faz `POST` multipart direto para `croqui.php` em nova aba. |
| `js/form.js` | Mostra/oculta grupos de campo conforme o tipo escolhido, aplica máscara numérica no padrão brasileiro (`0,000` / `0,00`), trata checkboxes mutuamente exclusivos e o preview de imagem. |
| `croqui.php` | Recebe o `$_POST` e renderiza, em um único arquivo (CSS e JS inline), o documento "ENCOMENDA ESPECIAL" completo — repetindo a mesma ramificação por tipo que existe no formulário. Desenha um mock CSS/JS da peça quando não há foto, e usa `html2canvas` + `jsPDF` via CDN para exportar PDF/PNG. Não há geração de PDF no servidor. |
| `biblioteca_imagens.php` | Janela popup que lista as imagens de `uploads/` (jpg/jpeg/png/gif), com busca via AJAX. Ao clicar numa imagem, escreve diretamente no DOM da janela que a abriu através de `window.opener` — não passa pelo servidor. |
| `uploads/` | Guarda tanto fotos enviadas por quem está preenchendo o pedido quanto uma biblioteca de imagens de produtos já pré-cadastrada — nem todo arquivo ali veio de um pedido real. |

### Desconectado do fluxo real

| Arquivo | Situação |
|---|---|
| `processar.php` | Grava os dados do formulário em `$_SESSION` e redireciona para `croqui.php`. Como `croqui.php` só lê `$_POST`, esse caminho não funciona como está. |
| `croqui.html` + `js/croqui.js` | Versão estática com dados fixos de exemplo, sem PHP. Não é referenciada por `index.html`. |
| `print.html` | Espera uma imagem via parâmetro `?img=` na URL e imprime automaticamente. Nada no projeto o chama hoje. |
| `css/style.css` | Não está vinculado por nenhum `<link>` em nenhum arquivo do projeto. Provável resíduo de uma versão anterior do formulário. |

## 5. O produto e seus campos

`tipo` é o eixo central do projeto: tanto `js/form.js` quanto `croqui.php` ramificam por ele, de forma independente e duplicada. Ao adicionar um tipo novo, os lugares relevantes precisam ser atualizados juntos.

| Tipo | Campos extras mostrados | Onde ramifica |
|---|---|---|
| PORTA | espessura da porta, caixa do batente, tipo de porta (SÓ FOLHA / CONJUNTO / FRISADA / RASGADA), padrão de madeira, lados, tipo e lado de abertura | index.html, form.js, croqui.php |
| ESQUADRIA | padrão de madeira, medidas de guarnição, lados, tipo/lado de abertura, tipo de palheta, acabamento de ferragem, vidros | index.html, form.js, croqui.php |
| BATENTE | reaproveita profundidade/largura com rótulos trocados (espessura do batente, comprimento da cabeceira) | form.js |
| KIT DE CORRER | tipo de kit (madeira/alumínio/inox), modelo (embutir, roldana aparente, batente aparente, sem batente) | index.html, form.js, croqui.php |
| DEGRAU / PATAMAR / RODAPÉ | reaproveita altura/profundidade com rótulos trocados (comprimento, espessura) | form.js |
| GUARNIÇÃO / FECHADURA / PUXADOR | mostra só profundidade; esconde grupo de serviço | form.js |

## 6. Convenções

- **Formato numérico brasileiro:** medidas usam vírgula decimal (`0,000` m) e preço usa `0,00` com separador de milhar por ponto — formatado dígito a dígito em `formatarNumero`/`formatarPreco` (`js/form.js`), sem biblioteca.
- **Um arquivo, um documento:** `croqui.php` concentra HTML, CSS e JS do documento final em um único arquivo — inclusive o desenho mock da peça e a exportação para PDF/PNG.
- **Sem estado no servidor** no caminho real: cada envio do formulário é autocontido no POST; a única persistência é o arquivo de imagem salvo em `uploads/`.

## 7. Problemas conhecidos

### CSS quebrado — bloco de regras aninhado por engano
`css/croqui.css`, dentro do seletor `input, textarea, select`.

Um trecho inteiro (`body`, `.card`, `.imagem-produto`, `.botao-voltar`, `ul`) foi colado dentro das chaves do seletor de inputs, aparentemente por engano ao copiar de outra página. Isso invalida a regra de estilo real dos campos, que fica perdida no meio desse bloco.

### JS quebrado — IDs inexistentes travam o restante do script
`js/form.js`, bloco "Gerenciamento de imagem".

Referencia `#preview` e `#limpar-imagem`, que não existem em `index.html` (que usa `#preview-imagem`/`#preview-container` via script inline próprio). Isso lança um erro dentro do `DOMContentLoaded`, abortando tudo que vem depois no mesmo callback — inclusive a chamada final `criarCampoKitCorrer()`. O formulário continua funcionando porque o essencial já rodou antes do erro, mas o bloco final nunca executa.

### Caminho morto — processar.php não alimenta croqui.php
`processar.php` → `$_SESSION` → `croqui.php`.

`croqui.php` só lê `$_POST`; nunca lê `$_SESSION`. Se alguém reativar esse fluxo, vai encontrar todas as variáveis indefinidas.

### Sem sanitização — dados de processar.php não passam por htmlspecialchars
`processar.php`.

Diferente de `croqui.php`, que escapa a maioria dos campos antes de exibir, `processar.php` grava os valores de `$_POST` direto na sessão sem tratamento — baixo risco enquanto o caminho seguir desconectado, mas relevante se for reaproveitado.

---
*Documento gerado a partir da leitura de todos os arquivos do repositório `gerador-produto-coringa`. Reflete o estado do código no momento da análise — revalide antes de agir sobre qualquer ponto aqui se o código tiver mudado.*
