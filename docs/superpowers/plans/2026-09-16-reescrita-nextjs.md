# Reescrita v1 do Produto Coringa (Next.js) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reescrever o gerador de encomendas especiais da Madel como uma aplicação Next.js sem backend (wizard de 5 etapas + motor de produtos + exportação client-side), publicável na Vercel.

**Architecture:** App Router do Next.js com o estado do wizard num Context persistido em `localStorage`, um "motor de produtos" data-driven (um arquivo TypeScript por tipo de croqui) que alimenta tanto o formulário dinâmico quanto o documento impresso, e uma biblioteca de imagens estática alimentada via git (arquivo + manifesto JSON). Nenhuma parte depende de servidor com estado.

**Tech Stack:** Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS; Vitest + Testing Library para testes; html2canvas + jsPDF para exportação.

**Spec:** `docs/superpowers/specs/2026-09-16-refatoracao-nextjs-design.md`

## Global Constraints

- Sem backend: nenhuma rota de API, banco de dados ou serviço externo (Supabase, Cloudinary etc.) nesta v1.
- Sem login/autenticação.
- Sem persistência de pedidos além de um rascunho único em `localStorage`.
- Biblioteca de imagens alimentada só via arquivo + `public/biblioteca.json`, sem tela de upload/admin.
- Campos comerciais do sistema antigo (Preço, Quantidade, Unidade, Montagem, Grupo de Serviço) não existem nesta versão.
- O documento gerado (`DocumentoCroqui`) sempre usa a paleta fixa vermelho/branco/grafite da Madel, independente do tema da interface.
- Dois botões de exportação separados: **Baixar PDF** e **Baixar Imagem** (nunca uma escolha combinada).
- Fornecedor e Custo são sempre campos opcionais.

---

### Task 1: Mover o projeto PHP legado e inicializar o projeto Next.js

**Files:**
- Move (git mv): `.prettierrc`, `CLAUDE.md`, `DOCUMENTACAO.md`, `biblioteca_imagens.php`, `croqui.html`, `croqui.php`, `css/`, `index.html`, `js/`, `madel-logo.png`, `madel-selo.png`, `print.html`, `processar.php`, `uploads/` → todos para dentro de `legado-php/`
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `.gitignore` (via `create-next-app`)

**Interfaces:**
- Produces: projeto Next.js funcional na raiz do repositório, servindo `/` a partir de `app/page.tsx`.

- [ ] **Step 1: Mover o sistema PHP legado para uma subpasta**

```bash
mkdir legado-php
git mv .prettierrc CLAUDE.md DOCUMENTACAO.md biblioteca_imagens.php croqui.html croqui.php css index.html js madel-logo.png madel-selo.png print.html processar.php uploads legado-php/
git commit -m "Move sistema PHP legado para legado-php/"
```

- [ ] **Step 2: Verificar que a raiz ficou limpa para o scaffold**

Run: `ls`
Expected: só aparecem `legado-php/`, `docs/`, `nova arquitetura.md` e `.git`

- [ ] **Step 3: Rodar o create-next-app na raiz**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias "@/*" --use-npm --no-git
```

Quando perguntado sobre Turbopack, responder "No" (manter webpack padrão, mais previsível para o restante do plano).

- [ ] **Step 4: Confirmar que o projeto builda**

Run: `npm run build`
Expected: build finaliza com "Compiled successfully" e sem erros de TypeScript.

- [ ] **Step 5: Instalar as dependências que o restante do plano usa**

```bash
npm install html2canvas jspdf
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 6: Configurar o Vitest**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

Create `vitest.setup.ts`:

```typescript
import "@testing-library/jest-dom/vitest";
```

Add to `package.json` `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 7: Confirmar que o Vitest roda (sem testes ainda)**

Run: `npm test`
Expected: "No test files found" — sem erro de configuração (o comando deve rodar e sair, não travar por falta de config).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Inicializa projeto Next.js + Tailwind + Vitest"
```

---

### Task 2: Motor de produtos — tipos e registro

**Files:**
- Create: `produtos/tipos.ts`
- Create: `produtos/index.ts`
- Test: `produtos/index.test.ts`

**Interfaces:**
- Produces: `Campo`, `ConfigProduto` (tipos), `TipoProdutoId` (union de ids), `PRODUTOS: Record<TipoProdutoId, ConfigProduto>`, `listarProdutos(): ConfigProduto[]`.

- [ ] **Step 1: Escrever `produtos/tipos.ts`**

```typescript
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
```

- [ ] **Step 2: Escrever o teste do registro (vai falhar — `produtos/index.ts` ainda não existe)**

Create `produtos/index.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { PRODUTOS, listarProdutos } from "./index";
import type { TipoProdutoId } from "./tipos";

const IDS_ESPERADOS: TipoProdutoId[] = [
  "porta-marcenaria",
  "porta-especial",
  "porta-acm",
  "esquadria",
  "degrau-patamar-rodape",
  "outros",
];

describe("registro de produtos", () => {
  it("tem exatamente os 6 tipos esperados", () => {
    expect(Object.keys(PRODUTOS).sort()).toEqual([...IDS_ESPERADOS].sort());
  });

  it("cada config tem nome, título de documento e prazo positivo", () => {
    for (const id of IDS_ESPERADOS) {
      const config = PRODUTOS[id];
      expect(config.nome.length).toBeGreaterThan(0);
      expect(config.tituloDocumento.length).toBeGreaterThan(0);
      expect(config.prazoEntregaDias).toBeGreaterThan(0);
    }
  });

  it("cada campo declarado tem id e label não vazios", () => {
    for (const id of IDS_ESPERADOS) {
      for (const campo of PRODUTOS[id].campos) {
        expect(campo.id.length).toBeGreaterThan(0);
        expect(campo.label.length).toBeGreaterThan(0);
      }
    }
  });

  it("não há ids de campo duplicados dentro do mesmo produto", () => {
    for (const id of IDS_ESPERADOS) {
      const ids = PRODUTOS[id].campos.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("listarProdutos retorna os 6 produtos", () => {
    expect(listarProdutos()).toHaveLength(6);
  });
});
```

- [ ] **Step 3: Rodar o teste e confirmar que falha**

Run: `npx vitest run produtos/index.test.ts`
Expected: FAIL — `Cannot find module './index'` (o arquivo ainda não existe)

- [ ] **Step 4: Escrever `produtos/index.ts` com um registro vazio só pra estrutura**

```typescript
import type { ConfigProduto, TipoProdutoId } from "./tipos";

export const PRODUTOS = {} as Record<TipoProdutoId, ConfigProduto>;

export function listarProdutos(): ConfigProduto[] {
  return Object.values(PRODUTOS);
}
```

- [ ] **Step 5: Rodar o teste e confirmar que ainda falha (esperado — os 6 produtos entram na Task 3)**

Run: `npx vitest run produtos/index.test.ts`
Expected: FAIL — "tem exatamente os 6 tipos esperados" (registro está vazio)

- [ ] **Step 6: Commit**

```bash
git add produtos/tipos.ts produtos/index.ts produtos/index.test.ts
git commit -m "Adiciona tipos do motor de produtos e teste do registro (vermelho)"
```

### Task 3: Configs dos 6 tipos de produto

**Files:**
- Create: `produtos/porta-marcenaria.ts`, `produtos/porta-especial.ts`, `produtos/porta-acm.ts`, `produtos/esquadria.ts`, `produtos/degrau-patamar-rodape.ts`, `produtos/outros.ts`
- Modify: `produtos/index.ts`
- Test: `produtos/configs.test.ts`

**Interfaces:**
- Consumes: `ConfigProduto`, `Campo*` de `produtos/tipos.ts` (Task 2)
- Produces: `portaMarcenaria`, `portaEspecial`, `portaAcm`, `esquadria`, `degrauPatamarRodape`, `outros` — cada um exportado do seu próprio arquivo e registrado em `PRODUTOS`

- [ ] **Step 1: Criar `produtos/porta-marcenaria.ts`**

```typescript
import type { ConfigProduto } from "./tipos";

export const portaMarcenaria: ConfigProduto = {
  id: "porta-marcenaria",
  nome: "Porta Marcenaria Madel",
  tituloDocumento: "ENCOMENDA ESPECIAL PORTAS",
  prazoEntregaDias: 60,
  campos: [
    { id: "tipoFolha", tipo: "multipla-escolha", label: "Tipo", opcoes: ["FRISADA", "RASGADA"] },
    { id: "friso", tipo: "opcao-unica", label: "Friso", opcoes: ["1 LADO", "2 LADOS"] },
    { id: "modeloFriso", tipo: "texto", label: "Modelo de friso" },
    { id: "profundidadeFriso", tipo: "medida", unidade: "m", label: "Profundidade do friso" },
    { id: "cava", tipo: "opcao-unica", label: "Cava", opcoes: ["FOLEADA", "SEM FOLEAR"] },
    { id: "cavaLados", tipo: "opcao-unica", label: "Cava", opcoes: ["1 LADO", "2 LADOS"] },
    { id: "alturaFolha", tipo: "medida", unidade: "m", label: "Altura da folha", obrigatorio: true },
    { id: "larguraFolha", tipo: "medida", unidade: "m", label: "Largura da folha", obrigatorio: true },
    { id: "espessuraFolha", tipo: "opcao-unica", label: "Espessura da folha", opcoes: ["35MM", "45MM"] },
    { id: "madeira", tipo: "opcao-unica", label: "Madeira", opcoes: ["IMBUIA", "CEDRO", "TAUARI"] },
    { id: "ladoMacaneta", tipo: "texto", label: "Lado da maçaneta" },
  ],
};
```

- [ ] **Step 2: Criar `produtos/porta-especial.ts`**

```typescript
import type { ConfigProduto } from "./tipos";

export const portaEspecial: ConfigProduto = {
  id: "porta-especial",
  nome: "Porta Encomenda Especial",
  tituloDocumento: "ENCOMENDA ESPECIAL PORTAS",
  prazoEntregaDias: 60,
  campos: [
    { id: "tipoFolha", tipo: "opcao-unica", label: "Tipo", opcoes: ["SÓ FOLHA", "CONJUNTO"], obrigatorio: true },
    { id: "tipoFriso", tipo: "opcao-unica", label: "Tipo de friso", opcoes: ["FRISADA", "RASGADA", "FRISADA E RASGADA"] },
    { id: "modeloFriso", tipo: "texto", label: "Modelo de friso" },
    { id: "alturaFolha", tipo: "medida", unidade: "m", label: "Altura da folha", obrigatorio: true },
    { id: "larguraFolha", tipo: "medida", unidade: "m", label: "Largura da folha", obrigatorio: true },
    { id: "caixaBatente", tipo: "medida", unidade: "m", label: "Caixa do batente" },
    { id: "padraoMadeira", tipo: "texto", label: "Padrão de madeira" },
    { id: "espessuraFolha", tipo: "medida", unidade: "m", label: "Espessura da folha" },
    { id: "medidasGuarnicao", tipo: "medida", unidade: "m", label: "Medidas de guarnição" },
    { id: "ladosGuarnicao", tipo: "opcao-unica", label: "Lados", opcoes: ["UM LADO", "DOIS LADOS"] },
    { id: "tipoAbertura", tipo: "texto", label: "Tipo de abertura" },
    { id: "ladoAbertura", tipo: "texto", label: "Lado de abertura" },
  ],
};
```

- [ ] **Step 3: Criar `produtos/porta-acm.ts`**

```typescript
import type { ConfigProduto } from "./tipos";

export const portaAcm: ConfigProduto = {
  id: "porta-acm",
  nome: "Porta de ACM",
  tituloDocumento: "ENCOMENDA ESPECIAL PORTAS ACM",
  prazoEntregaDias: 90,
  campos: [
    { id: "tipoFolha", tipo: "opcao-unica", label: "Tipo", opcoes: ["SÓ FOLHA", "CONJUNTO"], obrigatorio: true },
    { id: "tipoFerragemFechadura", tipo: "texto", label: "Tipo de ferragem e fechadura" },
    { id: "alturaFolha", tipo: "medida", unidade: "m", label: "Altura da folha", obrigatorio: true },
    { id: "larguraFolha", tipo: "medida", unidade: "m", label: "Largura da folha", obrigatorio: true },
    { id: "caixaBatente", tipo: "medida", unidade: "m", label: "Caixa do batente" },
    { id: "corAcm", tipo: "texto", label: "Cor do ACM" },
    { id: "espessuraFolha", tipo: "medida", unidade: "m", label: "Espessura da folha" },
    { id: "medidasGuarnicao", tipo: "medida", unidade: "m", label: "Medidas de guarnição" },
    { id: "ladosGuarnicao", tipo: "opcao-unica", label: "Lados", opcoes: ["UM LADO", "DOIS LADOS"] },
    { id: "tipoAbertura", tipo: "texto", label: "Tipo de abertura" },
    { id: "ladoAbertura", tipo: "texto", label: "Lado de abertura" },
  ],
};
```

- [ ] **Step 4: Criar `produtos/esquadria.ts`**

```typescript
import type { ConfigProduto } from "./tipos";

export const esquadria: ConfigProduto = {
  id: "esquadria",
  nome: "Esquadrias Encomenda",
  tituloDocumento: "ENCOMENDA ESPECIAL ESQUADRIAS",
  prazoEntregaDias: 60,
  campos: [
    { id: "altura", tipo: "medida", unidade: "m", label: "Altura", obrigatorio: true },
    { id: "largura", tipo: "medida", unidade: "m", label: "Largura", obrigatorio: true },
    { id: "caixa", tipo: "medida", unidade: "m", label: "Caixa" },
    { id: "padraoMadeira", tipo: "texto", label: "Padrão de madeira" },
    { id: "medidasGuarnicao", tipo: "medida", unidade: "m", label: "Medidas de guarnição" },
    { id: "ladosGuarnicao", tipo: "opcao-unica", label: "Lados", opcoes: ["UM LADO", "DOIS LADOS"] },
    { id: "tipoPalheta", tipo: "texto", label: "Tipo de palheta" },
    { id: "formatoPalheta", tipo: "opcao-unica", label: "Formato da palheta", opcoes: ["RETO", "ARCO"] },
    { id: "acabamentoFerragem", tipo: "texto", label: "Acabamento da ferragem" },
    { id: "comSemFerragem", tipo: "opcao-unica", label: "Ferragem", opcoes: ["COM FERRAGENS", "SEM FERRAGENS"] },
    { id: "tipoAbertura", tipo: "texto", label: "Tipo de abertura" },
    { id: "ladoAbertura", tipo: "texto", label: "Lado de abertura" },
    {
      id: "vidros",
      tipo: "opcao-unica",
      label: "Vidros",
      opcoes: [
        "CONSIDERAR QUANTIDADE DE VIDROS DO DESENHO",
        "FAZER QUANTIDADE E TAMANHOS PROPORCIONAIS ÀS MEDIDAS DA PEÇA",
        "QUANTIDADES E TAMANHOS A CRITÉRIO DA FÁBRICA",
      ],
    },
  ],
};
```

- [ ] **Step 5: Criar `produtos/degrau-patamar-rodape.ts`**

```typescript
import type { ConfigProduto } from "./tipos";

export const degrauPatamarRodape: ConfigProduto = {
  id: "degrau-patamar-rodape",
  nome: "Degrau / Patamar / Rodapé",
  tituloDocumento: "ENCOMENDA ESPECIAL DEGRAU/PATAMAR/RODAPÉ",
  prazoEntregaDias: 60,
  campos: [
    { id: "largura", tipo: "medida", unidade: "m", label: "Largura", obrigatorio: true },
    { id: "comprimento", tipo: "medida", unidade: "m", label: "Comprimento", obrigatorio: true },
    { id: "espessura", tipo: "medida", unidade: "m", label: "Espessura", obrigatorio: true },
    { id: "tipoMadeira", tipo: "texto", label: "Tipo de madeira", obrigatorio: true },
  ],
};
```

- [ ] **Step 6: Criar `produtos/outros.ts`**

```typescript
import type { ConfigProduto } from "./tipos";

export const outros: ConfigProduto = {
  id: "outros",
  nome: "Outros",
  tituloDocumento: "ENCOMENDA ESPECIAL",
  prazoEntregaDias: 60,
  campos: [],
};
```

- [ ] **Step 7: Atualizar `produtos/index.ts` para registrar os 6 tipos**

```typescript
import type { ConfigProduto, TipoProdutoId } from "./tipos";
import { portaMarcenaria } from "./porta-marcenaria";
import { portaEspecial } from "./porta-especial";
import { portaAcm } from "./porta-acm";
import { esquadria } from "./esquadria";
import { degrauPatamarRodape } from "./degrau-patamar-rodape";
import { outros } from "./outros";

export const PRODUTOS: Record<TipoProdutoId, ConfigProduto> = {
  "porta-marcenaria": portaMarcenaria,
  "porta-especial": portaEspecial,
  "porta-acm": portaAcm,
  esquadria,
  "degrau-patamar-rodape": degrauPatamarRodape,
  outros,
};

export function listarProdutos(): ConfigProduto[] {
  return Object.values(PRODUTOS);
}
```

- [ ] **Step 8: Rodar o teste do registro (Task 2) e confirmar que agora passa**

Run: `npx vitest run produtos/index.test.ts`
Expected: PASS (5 testes)

- [ ] **Step 9: Escrever testes de conteúdo específico por tipo**

Create `produtos/configs.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { PRODUTOS } from "./index";

describe("configs de produto — conteúdo específico", () => {
  it("porta-marcenaria: madeira é opção fixa Imbuia/Cedro/Tauari", () => {
    const campo = PRODUTOS["porta-marcenaria"].campos.find((c) => c.id === "madeira");
    expect(campo?.tipo).toBe("opcao-unica");
    expect(campo && "opcoes" in campo ? campo.opcoes : []).toEqual(["IMBUIA", "CEDRO", "TAUARI"]);
  });

  it("porta-marcenaria: não tem campo de caixa de batente (é só folha)", () => {
    const ids = PRODUTOS["porta-marcenaria"].campos.map((c) => c.id);
    expect(ids).not.toContain("caixaBatente");
  });

  it("porta-especial: tem caixa de batente e padrão de madeira livre", () => {
    const ids = PRODUTOS["porta-especial"].campos.map((c) => c.id);
    expect(ids).toContain("caixaBatente");
    const padrao = PRODUTOS["porta-especial"].campos.find((c) => c.id === "padraoMadeira");
    expect(padrao?.tipo).toBe("texto");
  });

  it("porta-acm: prazo de entrega é 90 dias e tem campo de cor do ACM", () => {
    expect(PRODUTOS["porta-acm"].prazoEntregaDias).toBe(90);
    const ids = PRODUTOS["porta-acm"].campos.map((c) => c.id);
    expect(ids).toContain("corAcm");
    expect(ids).not.toContain("padraoMadeira");
  });

  it("esquadria: vidros tem as 3 opções do formulário físico", () => {
    const campo = PRODUTOS.esquadria.campos.find((c) => c.id === "vidros");
    expect(campo && "opcoes" in campo ? campo.opcoes : []).toHaveLength(3);
  });

  it("degrau-patamar-rodape: só tem os 4 campos combinados, todos obrigatórios", () => {
    const campos = PRODUTOS["degrau-patamar-rodape"].campos;
    expect(campos).toHaveLength(4);
    expect(campos.every((c) => c.obrigatorio)).toBe(true);
  });

  it("outros: não tem nenhum campo estruturado", () => {
    expect(PRODUTOS.outros.campos).toHaveLength(0);
  });
});
```

- [ ] **Step 10: Rodar os testes e confirmar que passam**

Run: `npx vitest run produtos/`
Expected: PASS (todos os testes de `produtos/index.test.ts` e `produtos/configs.test.ts`)

- [ ] **Step 11: Commit**

```bash
git add produtos/
git commit -m "Adiciona os 6 tipos de produto ao motor de produtos"
```

### Task 4: `lib/formatacao.ts` — máscara de medida em metros (padrão brasileiro)

Reimplementa de forma pura e testável a lógica de `formatarNumero` do `legado-php/js/form.js`: o usuário digita dígitos e o campo sempre mostra `0,000` com 3 casas decimais, empurrando dígitos da direita para a esquerda.

**Files:**
- Create: `lib/formatacao.ts`
- Test: `lib/formatacao.test.ts`

**Interfaces:**
- Produces: `BUFFER_MEDIDA_INICIAL: string`, `atualizarBufferMedida(bufferAtual: string, valorBrutoDoInput: string): string`, `formatarBufferMedida(buffer: string): string`, `bufferMedidaParaMetros(buffer: string): number`

- [ ] **Step 1: Escrever o teste (vai falhar — arquivo ainda não existe)**

Create `lib/formatacao.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  atualizarBufferMedida,
  formatarBufferMedida,
  bufferMedidaParaMetros,
  BUFFER_MEDIDA_INICIAL,
} from "./formatacao";

describe("formatação de medida (padrão brasileiro)", () => {
  it("buffer inicial formata como 0,000", () => {
    expect(formatarBufferMedida(BUFFER_MEDIDA_INICIAL)).toBe("0,000");
  });

  it("digitar 9 uma vez produz 0,009", () => {
    // valorBrutoDoInput simula o valor completo do campo após a edição (o que o
    // navegador realmente entrega em onChange), não só o dígito novo isolado.
    const valorNoInput = formatarBufferMedida(BUFFER_MEDIDA_INICIAL) + "9";
    const buffer = atualizarBufferMedida(BUFFER_MEDIDA_INICIAL, valorNoInput);
    expect(formatarBufferMedida(buffer)).toBe("0,009");
  });

  it("digitar 2, 1, 0, 0 em sequência produz 2,100", () => {
    let buffer = BUFFER_MEDIDA_INICIAL;
    for (const digito of ["2", "1", "0", "0"]) {
      buffer = atualizarBufferMedida(buffer, formatarBufferMedida(buffer) + digito);
    }
    expect(formatarBufferMedida(buffer)).toBe("2,100");
  });

  it("apagar o último dígito visível volta uma casa", () => {
    // O buffer é só uma string de 4 dígitos — "2100" já representa 2,100 m
    // diretamente, sem precisar simular as 4 teclas que levariam até ele.
    let buffer = "2100";
    expect(formatarBufferMedida(buffer)).toBe("2,100");
    const valorAposApagar = formatarBufferMedida(buffer).slice(0, -1);
    buffer = atualizarBufferMedida(buffer, valorAposApagar);
    expect(formatarBufferMedida(buffer)).toBe("0,210");
  });

  it("campo vazio (tudo apagado) volta para 0,000", () => {
    const buffer = atualizarBufferMedida("2100", "");
    expect(formatarBufferMedida(buffer)).toBe("0,000");
  });

  it("converte buffer para metros", () => {
    expect(bufferMedidaParaMetros("2100")).toBe(2.1);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run lib/formatacao.test.ts`
Expected: FAIL — `Cannot find module './formatacao'`

- [ ] **Step 3: Implementar `lib/formatacao.ts`**

```typescript
export const BUFFER_MEDIDA_INICIAL = "0000";

export function atualizarBufferMedida(bufferAtual: string, valorBrutoDoInput: string): string {
  const digitos = valorBrutoDoInput.replace(/\D/g, "");
  if (digitos.length === 0) return BUFFER_MEDIDA_INICIAL;

  const apagando = digitos.length < bufferAtual.length;
  if (apagando) {
    return bufferAtual.slice(0, -1).padStart(4, "0");
  }

  const novoDigito = digitos.slice(-1);
  return (bufferAtual + novoDigito).slice(-4);
}

export function formatarBufferMedida(buffer: string): string {
  const b = buffer.padStart(4, "0").slice(-4);
  return `${b.slice(0, -3)},${b.slice(-3)}`;
}

export function bufferMedidaParaMetros(buffer: string): number {
  return Number(buffer) / 1000;
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run lib/formatacao.test.ts`
Expected: PASS (6 testes)

- [ ] **Step 5: Commit**

```bash
git add lib/formatacao.ts lib/formatacao.test.ts
git commit -m "Adiciona máscara de medida em metros (padrão brasileiro)"
```

### Task 5: Tema claro/escuro da interface

O documento gerado (`DocumentoCroqui`, Task 15) nunca usa isso — é só para a casca do app.

**Files:**
- Create: `lib/tema.ts`
- Test: `lib/tema.test.ts`
- Create: `components/ui/ThemeToggle.tsx`
- Test: `components/ui/ThemeToggle.test.tsx`
- Modify: `app/globals.css` (Tailwind v4 é CSS-first neste projeto — sem `tailwind.config.ts`, ver Task 1), `app/layout.tsx`

**Interfaces:**
- Produces: `Tema` (`"claro" | "escuro"`), `CHAVE_TEMA`, `obterTemaSalvo()`, `salvarTema(tema)`, `obterTemaPreferidoSistema()`, `resolverTemaInicial()`, componente `<ThemeToggle />`

- [ ] **Step 1: Escrever o teste de `lib/tema.ts` (vai falhar)**

Create `lib/tema.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { obterTemaSalvo, salvarTema, resolverTemaInicial, CHAVE_TEMA } from "./tema";

beforeEach(() => {
  window.localStorage.clear();
});

describe("preferência de tema", () => {
  it("retorna null quando nada foi salvo", () => {
    expect(obterTemaSalvo()).toBeNull();
  });

  it("salva e recupera o tema escolhido", () => {
    salvarTema("escuro");
    expect(obterTemaSalvo()).toBe("escuro");
  });

  it("ignora valor inválido salvo diretamente no localStorage", () => {
    window.localStorage.setItem(CHAVE_TEMA, "roxo");
    expect(obterTemaSalvo()).toBeNull();
  });

  it("resolverTemaInicial usa o valor salvo quando existe", () => {
    salvarTema("claro");
    expect(resolverTemaInicial()).toBe("claro");
  });

  it("resolverTemaInicial cai para o preferido do sistema quando não há nada salvo", () => {
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    expect(resolverTemaInicial()).toBe("escuro");
    window.matchMedia = original;
  });
});
```

Run: `npx vitest run lib/tema.test.ts`
Expected: FAIL — `Cannot find module './tema'`

- [ ] **Step 2: Implementar `lib/tema.ts`**

```typescript
export type Tema = "claro" | "escuro";

export const CHAVE_TEMA = "produto-coringa:tema";

export function obterTemaSalvo(): Tema | null {
  try {
    const valor = window.localStorage.getItem(CHAVE_TEMA);
    return valor === "claro" || valor === "escuro" ? valor : null;
  } catch {
    return null;
  }
}

export function salvarTema(tema: Tema): void {
  try {
    window.localStorage.setItem(CHAVE_TEMA, tema);
  } catch {
    // localStorage indisponível (modo privado, cota excedida) — ignora
  }
}

export function obterTemaPreferidoSistema(): Tema {
  if (typeof window === "undefined" || !window.matchMedia) return "claro";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro";
}

export function resolverTemaInicial(): Tema {
  return obterTemaSalvo() ?? obterTemaPreferidoSistema();
}
```

- [ ] **Step 3: Rodar e confirmar que passa**

Run: `npx vitest run lib/tema.test.ts`
Expected: PASS (5 testes)

- [ ] **Step 4: Configurar o Tailwind para tema por classe**

O projeto usa Tailwind v4 (config CSS-first — `create-next-app` não gerou `tailwind.config.ts`; ver Task 1). Em vez de um arquivo de config, adicione ao topo de `app/globals.css`, logo após o `@import "tailwindcss";` existente:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

Isso faz o Tailwind v4 tratar `dark:` como dependente da classe `.dark` no elemento raiz (que o script anti-flash do Step 8 e o `ThemeToggle` controlam), em vez de só `prefers-color-scheme`. Não crie nem edite nenhum `tailwind.config.ts` — ele não existe neste projeto.

- [ ] **Step 5: Escrever o teste do componente (vai falhar)**

Create `components/ui/ThemeToggle.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "./ThemeToggle";

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.classList.remove("dark");
});

describe("ThemeToggle", () => {
  it("alterna a classe dark no <html> ao clicar", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const botao = screen.getByRole("button");

    await user.click(botao);
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    await user.click(botao);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
```

Run: `npx vitest run components/ui/ThemeToggle.test.tsx`
Expected: FAIL — `Cannot find module './ThemeToggle'`

- [ ] **Step 6: Implementar `components/ui/ThemeToggle.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { resolverTemaInicial, salvarTema, type Tema } from "@/lib/tema";

export function ThemeToggle() {
  const [tema, setTema] = useState<Tema>("claro");

  useEffect(() => {
    setTema(resolverTemaInicial());
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", tema === "escuro");
  }, [tema]);

  function alternar() {
    const novoTema: Tema = tema === "claro" ? "escuro" : "claro";
    setTema(novoTema);
    salvarTema(novoTema);
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={tema === "claro" ? "Ativar tema escuro" : "Ativar tema claro"}
      className="rounded-full p-2 text-xl leading-none hover:bg-black/5 dark:hover:bg-white/10"
    >
      {tema === "claro" ? "🌙" : "☀️"}
    </button>
  );
}
```

- [ ] **Step 7: Rodar e confirmar que passa**

Run: `npx vitest run components/ui/ThemeToggle.test.tsx`
Expected: PASS

- [ ] **Step 8: Integrar no `app/layout.tsx` com script anti-flash**

O `create-next-app` desta versão já configura as fontes Geist via `next/font/google` (variáveis `--font-geist-sans`/`--font-geist-mono`, referenciadas em `app/globals.css`). Preserve essa configuração — não a remova — ao adicionar o script anti-flash, o cabeçalho e o `<ThemeToggle />`:

```tsx
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { CHAVE_TEMA } from "@/lib/tema";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata = {
  title: "Produto Coringa — Madel",
  description: "Gerador de encomendas especiais da Madel",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var tema = localStorage.getItem(${JSON.stringify(CHAVE_TEMA)});
                if (!tema) {
                  tema = window.matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro";
                }
                if (tema === "escuro") document.documentElement.classList.add("dark");
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <span className="font-semibold">MADEL — Produto Coringa</span>
          <ThemeToggle />
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 9: Confirmar que o projeto builda**

Run: `npm run build`
Expected: build passa sem erros

- [ ] **Step 10: Commit**

```bash
git add lib/tema.ts lib/tema.test.ts components/ui/ThemeToggle.tsx components/ui/ThemeToggle.test.tsx app/globals.css app/layout.tsx
git commit -m "Adiciona tema claro/escuro da interface"
```

### Task 6: `lib/pedido.ts` e `lib/wizard-storage.ts` — estado do pedido e persistência

**Files:**
- Create: `lib/pedido.ts`
- Create: `lib/wizard-storage.ts`
- Test: `lib/wizard-storage.test.ts`

**Interfaces:**
- Consumes: `TipoProdutoId` de `produtos/tipos.ts`
- Produces: `EtapaId`, `EstadoPedido`, `ESTADO_INICIAL` (de `lib/pedido.ts`); `CHAVE_RASCUNHO`, `salvarRascunho(estado)`, `carregarRascunho()`, `limparRascunho()`, `existeRascunho()` (de `lib/wizard-storage.ts`)

- [ ] **Step 1: Criar `lib/pedido.ts`**

```typescript
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
```

- [ ] **Step 2: Escrever o teste de `lib/wizard-storage.ts` (vai falhar)**

Create `lib/wizard-storage.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import {
  salvarRascunho,
  carregarRascunho,
  limparRascunho,
  existeRascunho,
  CHAVE_RASCUNHO,
} from "./wizard-storage";
import { ESTADO_INICIAL } from "./pedido";

beforeEach(() => {
  window.localStorage.clear();
});

describe("wizard-storage", () => {
  it("não existe rascunho antes de salvar nada", () => {
    expect(existeRascunho()).toBe(false);
    expect(carregarRascunho()).toBeNull();
  });

  it("salva e recupera um estado", () => {
    const estado = { ...ESTADO_INICIAL, tipo: "esquadria" as const };
    salvarRascunho(estado);
    expect(carregarRascunho()).toEqual(estado);
    expect(existeRascunho()).toBe(true);
  });

  it("limparRascunho remove o que estava salvo", () => {
    salvarRascunho({ ...ESTADO_INICIAL, tipo: "outros" });
    limparRascunho();
    expect(carregarRascunho()).toBeNull();
  });

  it("ignora um valor corrompido salvo diretamente na chave", () => {
    window.localStorage.setItem(CHAVE_RASCUNHO, "{not json");
    expect(carregarRascunho()).toBeNull();
  });
});
```

Run: `npx vitest run lib/wizard-storage.test.ts`
Expected: FAIL — `Cannot find module './wizard-storage'`

- [ ] **Step 3: Implementar `lib/wizard-storage.ts`**

```typescript
import { ESTADO_INICIAL, type EstadoPedido } from "./pedido";

export const CHAVE_RASCUNHO = "produto-coringa:rascunho";

export function salvarRascunho(estado: EstadoPedido): void {
  try {
    window.localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(estado));
  } catch {
    // localStorage indisponível ou cota excedida — ignora silenciosamente
  }
}

export function carregarRascunho(): EstadoPedido | null {
  try {
    const bruto = window.localStorage.getItem(CHAVE_RASCUNHO);
    if (!bruto) return null;
    const dados = JSON.parse(bruto);
    if (typeof dados !== "object" || dados === null || !("pedido" in dados)) return null;
    return { ...ESTADO_INICIAL, ...dados };
  } catch {
    return null;
  }
}

export function limparRascunho(): void {
  try {
    window.localStorage.removeItem(CHAVE_RASCUNHO);
  } catch {
    // ignora
  }
}

export function existeRascunho(): boolean {
  return carregarRascunho() !== null;
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run lib/wizard-storage.test.ts`
Expected: PASS (4 testes)

- [ ] **Step 5: Commit**

```bash
git add lib/pedido.ts lib/wizard-storage.ts lib/wizard-storage.test.ts
git commit -m "Adiciona estado do pedido e persistência do rascunho em localStorage"
```

### Task 7: `lib/wizard-context.tsx` — reducer e Context do wizard

**Files:**
- Create: `lib/wizard-context.tsx`
- Test: `lib/wizard-context.test.tsx`

**Interfaces:**
- Consumes: `EstadoPedido`, `ESTADO_INICIAL`, `EtapaId` (Task 6); `salvarRascunho` (Task 6); `TipoProdutoId` (Task 2)
- Produces: `AcaoPedido`, `reducerPedido(estado, acao)`, `<WizardProvider>`, `useWizard()` → `{ estado, dispatch }`

- [ ] **Step 1: Escrever o teste do reducer puro (vai falhar)**

Create `lib/wizard-context.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { reducerPedido } from "./wizard-context";
import { ESTADO_INICIAL } from "./pedido";

describe("reducerPedido", () => {
  it("DEFINIR_TIPO troca o tipo e limpa especificações antigas", () => {
    const comEspec = reducerPedido(ESTADO_INICIAL, {
      type: "ATUALIZAR_ESPECIFICACAO",
      campoId: "altura",
      valor: "2100",
    });
    const resultado = reducerPedido(comEspec, { type: "DEFINIR_TIPO", tipo: "esquadria" });
    expect(resultado.tipo).toBe("esquadria");
    expect(resultado.especificacoes).toEqual({});
  });

  it("ATUALIZAR_PEDIDO atualiza só o campo informado", () => {
    const resultado = reducerPedido(ESTADO_INICIAL, {
      type: "ATUALIZAR_PEDIDO",
      campo: "cliente",
      valor: "João da Silva",
    });
    expect(resultado.pedido.cliente).toBe("João da Silva");
    expect(resultado.pedido.vendedor).toBe("");
  });

  it("DEFINIR_IMAGEM_BIBLIOTECA limpa upload avulso anterior", () => {
    const comUpload = reducerPedido(ESTADO_INICIAL, {
      type: "DEFINIR_IMAGEM_UPLOAD",
      dataUrl: "data:image/jpeg;base64,ABC",
    });
    const resultado = reducerPedido(comUpload, {
      type: "DEFINIR_IMAGEM_BIBLIOTECA",
      bibliotecaId: "porta-x",
    });
    expect(resultado.imagem).toEqual({ origem: "biblioteca", bibliotecaId: "porta-x", uploadDataUrl: null });
  });

  it("IR_PARA_ETAPA atualiza a última etapa visitada", () => {
    const resultado = reducerPedido(ESTADO_INICIAL, { type: "IR_PARA_ETAPA", etapa: "imagem" });
    expect(resultado.ultimaEtapa).toBe("imagem");
  });

  it("REINICIAR volta ao estado inicial", () => {
    const alterado = reducerPedido(ESTADO_INICIAL, { type: "ATUALIZAR_PEDIDO", campo: "cliente", valor: "X" });
    expect(reducerPedido(alterado, { type: "REINICIAR" })).toEqual(ESTADO_INICIAL);
  });
});
```

Run: `npx vitest run lib/wizard-context.test.tsx`
Expected: FAIL — `Cannot find module './wizard-context'`

- [ ] **Step 2: Implementar `lib/wizard-context.tsx`**

```tsx
"use client";

import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from "react";
import { ESTADO_INICIAL, type EstadoPedido, type EtapaId } from "./pedido";
import { salvarRascunho } from "./wizard-storage";
import type { TipoProdutoId } from "@/produtos/tipos";

export type AcaoPedido =
  | { type: "DEFINIR_TIPO"; tipo: TipoProdutoId }
  | { type: "ATUALIZAR_PEDIDO"; campo: keyof EstadoPedido["pedido"]; valor: string }
  | { type: "ATUALIZAR_ESPECIFICACAO"; campoId: string; valor: string }
  | { type: "DEFINIR_IMAGEM_BIBLIOTECA"; bibliotecaId: string }
  | { type: "DEFINIR_IMAGEM_UPLOAD"; dataUrl: string }
  | { type: "REMOVER_IMAGEM" }
  | { type: "ATUALIZAR_COMPRA"; campo: keyof EstadoPedido["compra"]; valor: string }
  | { type: "IR_PARA_ETAPA"; etapa: EtapaId }
  | { type: "CARREGAR_ESTADO"; estado: EstadoPedido }
  | { type: "REINICIAR" };

export function reducerPedido(estado: EstadoPedido, acao: AcaoPedido): EstadoPedido {
  switch (acao.type) {
    case "DEFINIR_TIPO":
      return { ...estado, tipo: acao.tipo, especificacoes: {} };
    case "ATUALIZAR_PEDIDO":
      return { ...estado, pedido: { ...estado.pedido, [acao.campo]: acao.valor } };
    case "ATUALIZAR_ESPECIFICACAO":
      return { ...estado, especificacoes: { ...estado.especificacoes, [acao.campoId]: acao.valor } };
    case "DEFINIR_IMAGEM_BIBLIOTECA":
      return { ...estado, imagem: { origem: "biblioteca", bibliotecaId: acao.bibliotecaId, uploadDataUrl: null } };
    case "DEFINIR_IMAGEM_UPLOAD":
      return { ...estado, imagem: { origem: "upload", bibliotecaId: null, uploadDataUrl: acao.dataUrl } };
    case "REMOVER_IMAGEM":
      return { ...estado, imagem: { origem: null, bibliotecaId: null, uploadDataUrl: null } };
    case "ATUALIZAR_COMPRA":
      return { ...estado, compra: { ...estado.compra, [acao.campo]: acao.valor } };
    case "IR_PARA_ETAPA":
      return { ...estado, ultimaEtapa: acao.etapa };
    case "CARREGAR_ESTADO":
      return acao.estado;
    case "REINICIAR":
      return ESTADO_INICIAL;
    default:
      return estado;
  }
}

type WizardContextValor = {
  estado: EstadoPedido;
  dispatch: Dispatch<AcaoPedido>;
};

const WizardContext = createContext<WizardContextValor | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [estado, dispatch] = useReducer(reducerPedido, ESTADO_INICIAL);

  useEffect(() => {
    const id = setTimeout(() => salvarRascunho(estado), 300);
    return () => clearTimeout(id);
  }, [estado]);

  return <WizardContext.Provider value={{ estado, dispatch }}>{children}</WizardContext.Provider>;
}

export function useWizard(): WizardContextValor {
  const contexto = useContext(WizardContext);
  if (!contexto) throw new Error("useWizard precisa ser usado dentro de <WizardProvider>");
  return contexto;
}
```

- [ ] **Step 3: Rodar e confirmar que passa**

Run: `npx vitest run lib/wizard-context.test.tsx`
Expected: PASS (5 testes)

- [ ] **Step 4: Commit**

```bash
git add lib/wizard-context.tsx lib/wizard-context.test.tsx
git commit -m "Adiciona reducer e Context do wizard"
```

### Task 8: Recuperação de rascunho e layout de `/criar`

**Files:**
- Create: `components/wizard/DraftRecoveryPrompt.tsx`
- Test: `components/wizard/DraftRecoveryPrompt.test.tsx`
- Create: `app/criar/layout.tsx`

**Interfaces:**
- Consumes: `useWizard()` (Task 7), `carregarRascunho`/`limparRascunho`/`existeRascunho` (Task 6)
- Produces: `<DraftRecoveryPrompt />` (dialog que carrega ou descarta o rascunho salvo)

- [ ] **Step 1: Escrever o teste (vai falhar)**

Create `components/wizard/DraftRecoveryPrompt.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WizardProvider } from "@/lib/wizard-context";
import { DraftRecoveryPrompt } from "./DraftRecoveryPrompt";
import { salvarRascunho } from "@/lib/wizard-storage";
import { ESTADO_INICIAL } from "@/lib/pedido";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

beforeEach(() => {
  window.localStorage.clear();
  push.mockClear();
});

describe("DraftRecoveryPrompt", () => {
  it("não mostra nada quando não há rascunho salvo", () => {
    render(
      <WizardProvider>
        <DraftRecoveryPrompt />
      </WizardProvider>
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("mostra o aviso e carrega o rascunho ao clicar em Continuar", async () => {
    salvarRascunho({ ...ESTADO_INICIAL, tipo: "esquadria", ultimaEtapa: "especificacoes" });
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <DraftRecoveryPrompt />
      </WizardProvider>
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(push).toHaveBeenCalledWith("/criar/especificacoes");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("descarta o rascunho ao clicar em Começar nova", async () => {
    salvarRascunho({ ...ESTADO_INICIAL, tipo: "outros", ultimaEtapa: "pedido" });
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <DraftRecoveryPrompt />
      </WizardProvider>
    );

    await user.click(screen.getByRole("button", { name: "Começar nova" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
```

Run: `npx vitest run components/wizard/DraftRecoveryPrompt.test.tsx`
Expected: FAIL — `Cannot find module './DraftRecoveryPrompt'`

- [ ] **Step 2: Implementar `components/wizard/DraftRecoveryPrompt.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWizard } from "@/lib/wizard-context";
import { carregarRascunho, limparRascunho, existeRascunho } from "@/lib/wizard-storage";

export function DraftRecoveryPrompt() {
  const { dispatch } = useWizard();
  const router = useRouter();
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    setMostrar(existeRascunho());
  }, []);

  function continuar() {
    const rascunho = carregarRascunho();
    if (rascunho) {
      dispatch({ type: "CARREGAR_ESTADO", estado: rascunho });
      router.push(`/criar/${rascunho.ultimaEtapa}`);
    }
    setMostrar(false);
  }

  function comecarNova() {
    limparRascunho();
    dispatch({ type: "REINICIAR" });
    setMostrar(false);
  }

  if (!mostrar) return null;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-w-sm rounded-xl bg-white p-6 text-center shadow-xl dark:bg-gray-900">
        <p className="mb-4">Encontramos uma encomenda não finalizada. Deseja continuar?</p>
        <div className="flex justify-center gap-3">
          <button type="button" onClick={comecarNova} className="rounded-md border px-4 py-2">
            Começar nova
          </button>
          <button type="button" onClick={continuar} className="rounded-md bg-red-700 px-4 py-2 text-white">
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Rodar e confirmar que passa**

Run: `npx vitest run components/wizard/DraftRecoveryPrompt.test.tsx`
Expected: PASS (3 testes)

- [ ] **Step 4: Criar `app/criar/layout.tsx`**

```tsx
import type { ReactNode } from "react";
import { WizardProvider } from "@/lib/wizard-context";
import { DraftRecoveryPrompt } from "@/components/wizard/DraftRecoveryPrompt";

export default function CriarLayout({ children }: { children: ReactNode }) {
  return (
    <WizardProvider>
      <DraftRecoveryPrompt />
      <div className="mx-auto max-w-2xl px-4 py-8">{children}</div>
    </WizardProvider>
  );
}
```

- [ ] **Step 5: Confirmar que o projeto builda**

Run: `npm run build`
Expected: build passa sem erros (as rotas dentro de `app/criar/` ainda não existem — isso é esperado, `layout.tsx` sozinho não quebra o build)

- [ ] **Step 6: Commit**

```bash
git add components/wizard/DraftRecoveryPrompt.tsx components/wizard/DraftRecoveryPrompt.test.tsx app/criar/layout.tsx
git commit -m "Adiciona recuperação de rascunho e layout do wizard"
```

### Task 9: Indicador de progresso e Etapa 1 (Tipo)

**Files:**
- Create: `components/wizard/StepIndicator.tsx`
- Create: `app/criar/tipo/page.tsx`
- Test: `app/criar/tipo/page.test.tsx`

**Interfaces:**
- Consumes: `listarProdutos()` (Task 3), `useWizard()` (Task 7), `EtapaId` (Task 6)
- Produces: `<StepIndicator etapaAtual={EtapaId} />`, página `/criar/tipo`

- [ ] **Step 1: Criar `components/wizard/StepIndicator.tsx`**

```tsx
import type { EtapaId } from "@/lib/pedido";

const ETAPAS: { id: EtapaId; label: string }[] = [
  { id: "tipo", label: "Tipo" },
  { id: "pedido", label: "Pedido" },
  { id: "especificacoes", label: "Especificações" },
  { id: "imagem", label: "Imagem" },
  { id: "revisao", label: "Revisão" },
];

export function StepIndicator({ etapaAtual }: { etapaAtual: EtapaId }) {
  const indiceAtual = ETAPAS.findIndex((e) => e.id === etapaAtual);
  return (
    <ol className="mb-8 flex flex-wrap gap-3 text-sm">
      {ETAPAS.map((etapa, indice) => (
        <li
          key={etapa.id}
          className={
            indice === indiceAtual
              ? "font-semibold text-red-700 dark:text-red-400"
              : indice < indiceAtual
                ? "text-gray-500 dark:text-gray-400"
                : "text-gray-300 dark:text-gray-600"
          }
        >
          {indice + 1}. {etapa.label}
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 2: Escrever o teste da Etapa 1 (vai falhar)**

Create `app/criar/tipo/page.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WizardProvider } from "@/lib/wizard-context";
import EtapaTipo from "./page";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

beforeEach(() => {
  window.localStorage.clear();
  push.mockClear();
});

describe("Etapa Tipo", () => {
  it("bloqueia o Próximo até escolher um tipo", () => {
    render(
      <WizardProvider>
        <EtapaTipo />
      </WizardProvider>
    );
    expect(screen.getByRole("button", { name: /Próximo/ })).toBeDisabled();
  });

  it("escolhe um tipo e avança para a Etapa de Pedido", async () => {
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <EtapaTipo />
      </WizardProvider>
    );

    await user.click(screen.getByRole("button", { name: "Esquadrias Encomenda" }));
    const botaoProximo = screen.getByRole("button", { name: /Próximo/ });
    expect(botaoProximo).toBeEnabled();

    await user.click(botaoProximo);
    expect(push).toHaveBeenCalledWith("/criar/pedido");
  });
});
```

Run: `npx vitest run app/criar/tipo/page.test.tsx`
Expected: FAIL — `Cannot find module './page'`

- [ ] **Step 3: Implementar `app/criar/tipo/page.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWizard } from "@/lib/wizard-context";
import { listarProdutos } from "@/produtos";
import type { TipoProdutoId } from "@/produtos/tipos";
import { StepIndicator } from "@/components/wizard/StepIndicator";

export default function EtapaTipo() {
  const { estado, dispatch } = useWizard();
  const router = useRouter();
  const produtos = listarProdutos();

  useEffect(() => {
    dispatch({ type: "IR_PARA_ETAPA", etapa: "tipo" });
  }, [dispatch]);

  function escolher(tipoId: TipoProdutoId) {
    dispatch({ type: "DEFINIR_TIPO", tipo: tipoId });
  }

  return (
    <div>
      <StepIndicator etapaAtual="tipo" />
      <h1 className="mb-6 text-2xl font-semibold">O que você deseja criar?</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {produtos.map((produto) => (
          <button
            key={produto.id}
            type="button"
            onClick={() => escolher(produto.id)}
            aria-pressed={estado.tipo === produto.id}
            className={`rounded-lg border p-4 text-left transition ${
              estado.tipo === produto.id
                ? "border-red-700 bg-red-50 dark:bg-red-950/40"
                : "border-gray-200 dark:border-gray-700"
            }`}
          >
            {produto.nome}
          </button>
        ))}
      </div>
      <div className="mt-8 flex justify-end">
        <button
          type="button"
          disabled={!estado.tipo}
          onClick={() => router.push("/criar/pedido")}
          className="rounded-md bg-red-700 px-5 py-2 text-white disabled:opacity-40"
        >
          Próximo →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run app/criar/tipo/page.test.tsx`
Expected: PASS (2 testes)

- [ ] **Step 5: Commit**

```bash
git add components/wizard/StepIndicator.tsx app/criar/tipo/
git commit -m "Adiciona indicador de progresso e Etapa 1 (Tipo)"
```

### Task 10: Etapa 2 (Pedido)

**Files:**
- Create: `app/criar/pedido/page.tsx`
- Test: `app/criar/pedido/page.test.tsx`

**Interfaces:**
- Consumes: `useWizard()` (Task 7), `StepIndicator` (Task 9)

- [ ] **Step 1: Escrever o teste (vai falhar)**

Create `app/criar/pedido/page.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WizardProvider } from "@/lib/wizard-context";
import EtapaPedido from "./page";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

beforeEach(() => {
  window.localStorage.clear();
  push.mockClear();
});

describe("Etapa Pedido", () => {
  it("bloqueia o Próximo sem descrição preenchida", () => {
    render(
      <WizardProvider>
        <EtapaPedido />
      </WizardProvider>
    );
    expect(screen.getByRole("button", { name: /Próximo/ })).toBeDisabled();
  });

  it("libera o Próximo ao preencher a descrição e avança para Especificações", async () => {
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <EtapaPedido />
      </WizardProvider>
    );

    await user.type(screen.getByLabelText(/Descrição do produto/), "Porta 2 folhas");
    const botaoProximo = screen.getByRole("button", { name: /Próximo/ });
    expect(botaoProximo).toBeEnabled();

    await user.click(botaoProximo);
    expect(push).toHaveBeenCalledWith("/criar/especificacoes");
  });

  it("Voltar retorna para a Etapa de Tipo", async () => {
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <EtapaPedido />
      </WizardProvider>
    );
    await user.click(screen.getByRole("button", { name: /Voltar/ }));
    expect(push).toHaveBeenCalledWith("/criar/tipo");
  });
});
```

Run: `npx vitest run app/criar/pedido/page.test.tsx`
Expected: FAIL — `Cannot find module './page'`

- [ ] **Step 2: Implementar `app/criar/pedido/page.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWizard } from "@/lib/wizard-context";
import { StepIndicator } from "@/components/wizard/StepIndicator";

export default function EtapaPedido() {
  const { estado, dispatch } = useWizard();
  const router = useRouter();

  useEffect(() => {
    dispatch({ type: "IR_PARA_ETAPA", etapa: "pedido" });
  }, [dispatch]);

  function atualizar(campo: keyof typeof estado.pedido, valor: string) {
    dispatch({ type: "ATUALIZAR_PEDIDO", campo, valor });
  }

  const podeAvancar = estado.pedido.descricao.trim().length > 0;

  return (
    <div>
      <StepIndicator etapaAtual="pedido" />
      <h1 className="mb-6 text-2xl font-semibold">Informações do pedido</h1>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Cliente</span>
          <input
            className="w-full rounded-md border px-3 py-2 dark:bg-gray-900"
            value={estado.pedido.cliente}
            onChange={(e) => atualizar("cliente", e.target.value)}
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Nº do Pedido</span>
            <input
              className="w-full rounded-md border px-3 py-2 dark:bg-gray-900"
              value={estado.pedido.numeroPedido}
              onChange={(e) => atualizar("numeroPedido", e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Data</span>
            <input
              type="date"
              className="w-full rounded-md border px-3 py-2 dark:bg-gray-900"
              value={estado.pedido.data}
              onChange={(e) => atualizar("data", e.target.value)}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Vendedor</span>
            <input
              className="w-full rounded-md border px-3 py-2 dark:bg-gray-900"
              value={estado.pedido.vendedor}
              onChange={(e) => atualizar("vendedor", e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Loja</span>
            <input
              className="w-full rounded-md border px-3 py-2 dark:bg-gray-900"
              value={estado.pedido.loja}
              onChange={(e) => atualizar("loja", e.target.value)}
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            Descrição do produto <span className="text-red-700">*</span>
          </span>
          <textarea
            rows={4}
            className="w-full rounded-md border px-3 py-2 dark:bg-gray-900"
            value={estado.pedido.descricao}
            onChange={(e) => atualizar("descricao", e.target.value)}
          />
        </label>
      </div>

      <div className="mt-8 flex justify-between">
        <button type="button" onClick={() => router.push("/criar/tipo")} className="rounded-md border px-5 py-2">
          ← Voltar
        </button>
        <button
          type="button"
          disabled={!podeAvancar}
          onClick={() => router.push("/criar/especificacoes")}
          className="rounded-md bg-red-700 px-5 py-2 text-white disabled:opacity-40"
        >
          Próximo →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Rodar e confirmar que passa**

Run: `npx vitest run app/criar/pedido/page.test.tsx`
Expected: PASS (3 testes)

- [ ] **Step 4: Commit**

```bash
git add app/criar/pedido/
git commit -m "Adiciona Etapa 2 (Pedido)"
```

### Task 11: Componentes de campo dinâmico

**Files:**
- Create: `components/forms/CampoMedida.tsx`, `components/forms/CampoTexto.tsx`, `components/forms/CampoOpcaoUnica.tsx`, `components/forms/CampoMultiplaEscolha.tsx`, `components/forms/CampoDinamico.tsx`
- Test: `components/forms/CampoDinamico.test.tsx`

**Interfaces:**
- Consumes: `Campo` e suas variantes (Task 2), `atualizarBufferMedida`/`formatarBufferMedida`/`BUFFER_MEDIDA_INICIAL` (Task 4)
- Produces: `<CampoDinamico campo={Campo} valor={string} aoAlterar={(v: string) => void} />` — despacha para o componente certo conforme `campo.tipo`

- [ ] **Step 1: Criar os 4 componentes de campo**

Create `components/forms/CampoMedida.tsx`:

```tsx
"use client";

import type { CampoMedida as CampoMedidaConfig } from "@/produtos/tipos";
import { atualizarBufferMedida, formatarBufferMedida, BUFFER_MEDIDA_INICIAL } from "@/lib/formatacao";

type Props = { campo: CampoMedidaConfig; valor: string; aoAlterar: (novoValor: string) => void };

export function CampoMedida({ campo, valor, aoAlterar }: Props) {
  const buffer = valor || BUFFER_MEDIDA_INICIAL;
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">
        {campo.label} ({campo.unidade}) {campo.obrigatorio && <span className="text-red-700">*</span>}
      </span>
      <input
        inputMode="numeric"
        className="w-full rounded-md border px-3 py-2 dark:bg-gray-900"
        value={formatarBufferMedida(buffer)}
        onChange={(e) => aoAlterar(atualizarBufferMedida(buffer, e.target.value))}
      />
    </label>
  );
}
```

Create `components/forms/CampoTexto.tsx`:

```tsx
"use client";

import type { CampoTexto as CampoTextoConfig } from "@/produtos/tipos";

type Props = { campo: CampoTextoConfig; valor: string; aoAlterar: (novoValor: string) => void };

export function CampoTexto({ campo, valor, aoAlterar }: Props) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">
        {campo.label} {campo.obrigatorio && <span className="text-red-700">*</span>}
      </span>
      <input
        className="w-full rounded-md border px-3 py-2 dark:bg-gray-900"
        value={valor}
        onChange={(e) => aoAlterar(e.target.value)}
      />
    </label>
  );
}
```

Create `components/forms/CampoOpcaoUnica.tsx`:

```tsx
"use client";

import type { CampoOpcaoUnica as CampoOpcaoUnicaConfig } from "@/produtos/tipos";

type Props = { campo: CampoOpcaoUnicaConfig; valor: string; aoAlterar: (novoValor: string) => void };

export function CampoOpcaoUnica({ campo, valor, aoAlterar }: Props) {
  return (
    <fieldset className="block">
      <legend className="mb-1 text-sm font-medium">
        {campo.label} {campo.obrigatorio && <span className="text-red-700">*</span>}
      </legend>
      <div className="flex flex-wrap gap-4">
        {campo.opcoes.map((opcao) => (
          <label key={opcao} className="flex items-center gap-2 text-sm">
            <input type="radio" name={campo.id} checked={valor === opcao} onChange={() => aoAlterar(opcao)} />
            {opcao}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
```

Create `components/forms/CampoMultiplaEscolha.tsx`:

```tsx
"use client";

import type { CampoMultiplaEscolha as CampoMultiplaEscolhaConfig } from "@/produtos/tipos";

type Props = { campo: CampoMultiplaEscolhaConfig; valor: string; aoAlterar: (novoValor: string) => void };

function paraLista(valor: string): string[] {
  return valor ? valor.split("|") : [];
}

export function CampoMultiplaEscolha({ campo, valor, aoAlterar }: Props) {
  const selecionadas = paraLista(valor);

  function alternar(opcao: string) {
    const novaLista = selecionadas.includes(opcao)
      ? selecionadas.filter((item) => item !== opcao)
      : [...selecionadas, opcao];
    aoAlterar(novaLista.join("|"));
  }

  return (
    <fieldset className="block">
      <legend className="mb-1 text-sm font-medium">
        {campo.label} {campo.obrigatorio && <span className="text-red-700">*</span>}
      </legend>
      <div className="flex flex-wrap gap-4">
        {campo.opcoes.map((opcao) => (
          <label key={opcao} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={selecionadas.includes(opcao)} onChange={() => alternar(opcao)} />
            {opcao}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
```

- [ ] **Step 2: Escrever o teste do dispatcher (vai falhar — `CampoDinamico` ainda não existe)**

Create `components/forms/CampoDinamico.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CampoDinamico } from "./CampoDinamico";
import type { Campo } from "@/produtos/tipos";

describe("CampoDinamico", () => {
  it("campo de texto chama aoAlterar com o valor digitado", async () => {
    const aoAlterar = vi.fn();
    const campo: Campo = { id: "modeloFriso", tipo: "texto", label: "Modelo de friso" };
    render(<CampoDinamico campo={campo} valor="" aoAlterar={aoAlterar} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Modelo de friso"), "X");
    expect(aoAlterar).toHaveBeenCalledWith("X");
  });

  it("campo de medida formata e atualiza o buffer ao digitar", async () => {
    const aoAlterar = vi.fn();
    const campo: Campo = { id: "altura", tipo: "medida", unidade: "m", label: "Altura" };
    render(<CampoDinamico campo={campo} valor="" aoAlterar={aoAlterar} />);

    expect(screen.getByRole("textbox")).toHaveValue("0,000");
    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox"), "9");
    expect(aoAlterar).toHaveBeenCalledWith("0009");
  });

  it("campo de opção única marca a opção clicada", async () => {
    const aoAlterar = vi.fn();
    const campo: Campo = { id: "friso", tipo: "opcao-unica", label: "Friso", opcoes: ["1 LADO", "2 LADOS"] };
    render(<CampoDinamico campo={campo} valor="" aoAlterar={aoAlterar} />);

    const user = userEvent.setup();
    await user.click(screen.getByLabelText("2 LADOS"));
    expect(aoAlterar).toHaveBeenCalledWith("2 LADOS");
  });

  it("campo de múltipla escolha acumula seleções separadas por |", async () => {
    const aoAlterar = vi.fn();
    const campo: Campo = { id: "tipoFolha", tipo: "multipla-escolha", label: "Tipo", opcoes: ["FRISADA", "RASGADA"] };
    const { rerender } = render(<CampoDinamico campo={campo} valor="" aoAlterar={aoAlterar} />);

    const user = userEvent.setup();
    await user.click(screen.getByLabelText("FRISADA"));
    expect(aoAlterar).toHaveBeenCalledWith("FRISADA");

    rerender(<CampoDinamico campo={campo} valor="FRISADA" aoAlterar={aoAlterar} />);
    await user.click(screen.getByLabelText("RASGADA"));
    expect(aoAlterar).toHaveBeenCalledWith("FRISADA|RASGADA");
  });
});
```

Run: `npx vitest run components/forms/CampoDinamico.test.tsx`
Expected: FAIL — `Cannot find module './CampoDinamico'`

- [ ] **Step 3: Implementar `components/forms/CampoDinamico.tsx`**

```tsx
"use client";

import type { Campo } from "@/produtos/tipos";
import { CampoMedida } from "./CampoMedida";
import { CampoTexto } from "./CampoTexto";
import { CampoOpcaoUnica } from "./CampoOpcaoUnica";
import { CampoMultiplaEscolha } from "./CampoMultiplaEscolha";

type Props = { campo: Campo; valor: string; aoAlterar: (novoValor: string) => void };

export function CampoDinamico({ campo, valor, aoAlterar }: Props) {
  switch (campo.tipo) {
    case "medida":
      return <CampoMedida campo={campo} valor={valor} aoAlterar={aoAlterar} />;
    case "texto":
      return <CampoTexto campo={campo} valor={valor} aoAlterar={aoAlterar} />;
    case "opcao-unica":
      return <CampoOpcaoUnica campo={campo} valor={valor} aoAlterar={aoAlterar} />;
    case "multipla-escolha":
      return <CampoMultiplaEscolha campo={campo} valor={valor} aoAlterar={aoAlterar} />;
  }
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run components/forms/CampoDinamico.test.tsx`
Expected: PASS (4 testes)

- [ ] **Step 5: Commit**

```bash
git add components/forms/
git commit -m "Adiciona componentes de campo dinâmico do motor de produtos"
```

### Task 12: Validação de especificações e Etapa 3 (Especificações)

**Files:**
- Create: `produtos/validacao.ts`
- Test: `produtos/validacao.test.ts`
- Create: `app/criar/especificacoes/page.tsx`
- Test: `app/criar/especificacoes/page.test.tsx`

**Interfaces:**
- Consumes: `Campo`, `PRODUTOS` (Tasks 2–3), `BUFFER_MEDIDA_INICIAL` (Task 4), `useWizard()` (Task 7), `CampoDinamico` (Task 11)
- Produces: `campoEstaPreenchido(campo, valor)`, `especificacoesValidas(campos, especificacoes)`, página `/criar/especificacoes`

- [ ] **Step 1: Escrever o teste de validação (vai falhar)**

Create `produtos/validacao.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { campoEstaPreenchido, especificacoesValidas } from "./validacao";
import type { Campo } from "./tipos";
import { BUFFER_MEDIDA_INICIAL } from "@/lib/formatacao";

describe("validação de especificações", () => {
  it("campo de medida com buffer 0000 não conta como preenchido", () => {
    const campo: Campo = { id: "altura", tipo: "medida", unidade: "m", label: "Altura", obrigatorio: true };
    expect(campoEstaPreenchido(campo, BUFFER_MEDIDA_INICIAL)).toBe(false);
    expect(campoEstaPreenchido(campo, "2100")).toBe(true);
  });

  it("campo de texto vazio ou só espaços não conta como preenchido", () => {
    const campo: Campo = { id: "padraoMadeira", tipo: "texto", label: "Padrão de madeira" };
    expect(campoEstaPreenchido(campo, "   ")).toBe(false);
    expect(campoEstaPreenchido(campo, "Tauari")).toBe(true);
  });

  it("especificacoesValidas ignora campos não obrigatórios", () => {
    const campos: Campo[] = [
      { id: "altura", tipo: "medida", unidade: "m", label: "Altura", obrigatorio: true },
      { id: "caixa", tipo: "medida", unidade: "m", label: "Caixa" },
    ];
    expect(especificacoesValidas(campos, { altura: "2100" })).toBe(true);
  });

  it("especificacoesValidas bloqueia quando falta um campo obrigatório", () => {
    const campos: Campo[] = [{ id: "altura", tipo: "medida", unidade: "m", label: "Altura", obrigatorio: true }];
    expect(especificacoesValidas(campos, {})).toBe(false);
  });
});
```

Run: `npx vitest run produtos/validacao.test.ts`
Expected: FAIL — `Cannot find module './validacao'`

- [ ] **Step 2: Implementar `produtos/validacao.ts`**

```typescript
import type { Campo } from "./tipos";
import { BUFFER_MEDIDA_INICIAL } from "@/lib/formatacao";

export function campoEstaPreenchido(campo: Campo, valor: string | undefined): boolean {
  if (!valor) return false;
  if (campo.tipo === "medida") return valor !== BUFFER_MEDIDA_INICIAL;
  return valor.trim().length > 0;
}

export function especificacoesValidas(campos: Campo[], especificacoes: Record<string, string>): boolean {
  return campos
    .filter((campo) => campo.obrigatorio)
    .every((campo) => campoEstaPreenchido(campo, especificacoes[campo.id]));
}
```

- [ ] **Step 3: Rodar e confirmar que passa**

Run: `npx vitest run produtos/validacao.test.ts`
Expected: PASS (4 testes)

- [ ] **Step 4: Escrever o teste da Etapa 3 (vai falhar)**

Create `app/criar/especificacoes/page.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, type ReactNode } from "react";
import { WizardProvider, useWizard } from "@/lib/wizard-context";
import type { TipoProdutoId } from "@/produtos/tipos";
import EtapaEspecificacoes from "./page";

const push = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
}));

function ComTipo({ tipo, children }: { tipo: TipoProdutoId; children: ReactNode }) {
  const { dispatch } = useWizard();
  useEffect(() => {
    dispatch({ type: "DEFINIR_TIPO", tipo });
  }, [dispatch, tipo]);
  return <>{children}</>;
}

beforeEach(() => {
  window.localStorage.clear();
  push.mockClear();
  replace.mockClear();
});

describe("Etapa Especificações", () => {
  it("renderiza os campos do tipo escolhido e bloqueia o Próximo sem os obrigatórios", () => {
    render(
      <WizardProvider>
        <ComTipo tipo="esquadria">
          <EtapaEspecificacoes />
        </ComTipo>
      </WizardProvider>
    );

    expect(screen.getByText(/Especificações — Esquadrias Encomenda/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Próximo/ })).toBeDisabled();
  });

  it("libera o Próximo ao preencher altura e largura", async () => {
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <ComTipo tipo="esquadria">
          <EtapaEspecificacoes />
        </ComTipo>
      </WizardProvider>
    );

    await user.type(screen.getByLabelText(/^Altura/), "2100");
    await user.type(screen.getByLabelText(/^Largura/), "900");

    expect(screen.getByRole("button", { name: /Próximo/ })).toBeEnabled();
  });

  it("pula direto pra Etapa de Imagem quando o tipo é Outros", () => {
    render(
      <WizardProvider>
        <ComTipo tipo="outros">
          <EtapaEspecificacoes />
        </ComTipo>
      </WizardProvider>
    );

    expect(replace).toHaveBeenCalledWith("/criar/imagem");
  });
});
```

Run: `npx vitest run app/criar/especificacoes/page.test.tsx`
Expected: FAIL — `Cannot find module './page'`

- [ ] **Step 5: Implementar `app/criar/especificacoes/page.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWizard } from "@/lib/wizard-context";
import { PRODUTOS } from "@/produtos";
import { especificacoesValidas } from "@/produtos/validacao";
import { StepIndicator } from "@/components/wizard/StepIndicator";
import { CampoDinamico } from "@/components/forms/CampoDinamico";

export default function EtapaEspecificacoes() {
  const { estado, dispatch } = useWizard();
  const router = useRouter();
  const config = estado.tipo ? PRODUTOS[estado.tipo] : null;

  useEffect(() => {
    dispatch({ type: "IR_PARA_ETAPA", etapa: "especificacoes" });
  }, [dispatch]);

  useEffect(() => {
    if (!estado.tipo) {
      router.replace("/criar/tipo");
    } else if (config && config.campos.length === 0) {
      router.replace("/criar/imagem");
    }
  }, [estado.tipo, config, router]);

  if (!config || config.campos.length === 0) return null;

  const podeAvancar = especificacoesValidas(config.campos, estado.especificacoes);

  return (
    <div>
      <StepIndicator etapaAtual="especificacoes" />
      <h1 className="mb-6 text-2xl font-semibold">Especificações — {config.nome}</h1>

      <div className="space-y-5">
        {config.campos.map((campo) => (
          <CampoDinamico
            key={campo.id}
            campo={campo}
            valor={estado.especificacoes[campo.id] ?? ""}
            aoAlterar={(valor) => dispatch({ type: "ATUALIZAR_ESPECIFICACAO", campoId: campo.id, valor })}
          />
        ))}
      </div>

      <div className="mt-8 flex justify-between">
        <button type="button" onClick={() => router.push("/criar/pedido")} className="rounded-md border px-5 py-2">
          ← Voltar
        </button>
        <button
          type="button"
          disabled={!podeAvancar}
          onClick={() => router.push("/criar/imagem")}
          className="rounded-md bg-red-700 px-5 py-2 text-white disabled:opacity-40"
        >
          Próximo →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Rodar e confirmar que passa**

Run: `npx vitest run app/criar/especificacoes/page.test.tsx`
Expected: PASS (3 testes)

- [ ] **Step 7: Commit**

```bash
git add produtos/validacao.ts produtos/validacao.test.ts app/criar/especificacoes/
git commit -m "Adiciona validação de especificações e Etapa 3"
```

### Task 13: Biblioteca de imagens — dados, busca e migração das fotos existentes

O manifesto é implementado como um arquivo TypeScript (`lib/biblioteca-dados.ts`) em vez do `public/biblioteca.json` puro mencionado no spec — mesmo fluxo de manutenção (editar + commit + push), só que com checagem de tipos.

**Files:**
- Create: `lib/biblioteca-tipos.ts`
- Create: `lib/biblioteca.ts`
- Test: `lib/biblioteca.test.ts`
- Create: `lib/biblioteca-dados.ts` (gerado pelo script de migração)
- Create: `scripts/migrar-biblioteca.mjs`
- Create: `public/biblioteca/produtos/` (imagens migradas)

**Interfaces:**
- Produces: `ItemBiblioteca`, `BIBLIOTECA: ItemBiblioteca[]`, `buscarImagens(itens, termo)`, `caminhoImagem(item)`

- [ ] **Step 1: Criar `lib/biblioteca-tipos.ts`**

```typescript
export type ItemBiblioteca = {
  id: string;
  nome: string;
  categoria: string;
  arquivo: string;
};
```

- [ ] **Step 2: Escrever o teste de `lib/biblioteca.ts` (vai falhar)**

Create `lib/biblioteca.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buscarImagens, caminhoImagem } from "./biblioteca";
import type { ItemBiblioteca } from "./biblioteca-tipos";

const ITENS: ItemBiblioteca[] = [
  { id: "porta-arco", nome: "Porta Balcão Arco PF", categoria: "porta", arquivo: "porta-arco.jpg" },
  { id: "painel-solido", nome: "Painel Sólido Decorativo", categoria: "painel", arquivo: "painel-solido.jpg" },
];

describe("biblioteca de imagens", () => {
  it("sem termo de busca retorna todos os itens", () => {
    expect(buscarImagens(ITENS, "")).toEqual(ITENS);
  });

  it("filtra por nome, sem diferenciar maiúsculas/minúsculas", () => {
    expect(buscarImagens(ITENS, "arco")).toEqual([ITENS[0]]);
  });

  it("filtra por categoria", () => {
    expect(buscarImagens(ITENS, "painel")).toEqual([ITENS[1]]);
  });

  it("caminhoImagem monta o caminho público do arquivo", () => {
    expect(caminhoImagem(ITENS[0])).toBe("/biblioteca/produtos/porta-arco.jpg");
  });
});
```

Run: `npx vitest run lib/biblioteca.test.ts`
Expected: FAIL — `Cannot find module './biblioteca'`

- [ ] **Step 3: Implementar `lib/biblioteca.ts`**

```typescript
import type { ItemBiblioteca } from "./biblioteca-tipos";

export function buscarImagens(itens: ItemBiblioteca[], termo: string): ItemBiblioteca[] {
  const termoNormalizado = termo.trim().toLowerCase();
  if (!termoNormalizado) return itens;
  return itens.filter(
    (item) =>
      item.nome.toLowerCase().includes(termoNormalizado) ||
      item.categoria.toLowerCase().includes(termoNormalizado)
  );
}

export function caminhoImagem(item: ItemBiblioteca): string {
  return `/biblioteca/produtos/${item.arquivo}`;
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run lib/biblioteca.test.ts`
Expected: PASS (4 testes)

- [ ] **Step 5: Criar o manifesto vazio (será preenchido pelo script de migração)**

Create `lib/biblioteca-dados.ts`:

```typescript
import type { ItemBiblioteca } from "./biblioteca-tipos";

export const BIBLIOTECA: ItemBiblioteca[] = [];
```

- [ ] **Step 6: Escrever o script de migração das imagens legadas**

Create `scripts/migrar-biblioteca.mjs`:

```javascript
import { readdirSync, mkdirSync, copyFileSync, writeFileSync } from "node:fs";
import { extname, basename } from "node:path";

const ORIGEM = "legado-php/uploads";
const DESTINO = "public/biblioteca/produtos";
const EXTENSOES_VALIDAS = [".jpg", ".jpeg", ".png", ".webp"];

function paraSlug(nome) {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

mkdirSync(DESTINO, { recursive: true });

const arquivos = readdirSync(ORIGEM).filter((nome) =>
  EXTENSOES_VALIDAS.includes(extname(nome).toLowerCase())
);

const itens = arquivos.map((arquivoOriginal) => {
  const extensao = extname(arquivoOriginal);
  const nomeBase = basename(arquivoOriginal, extensao);
  const slug = paraSlug(nomeBase);
  const arquivoDestino = `${slug}${extensao.toLowerCase()}`;

  copyFileSync(`${ORIGEM}/${arquivoOriginal}`, `${DESTINO}/${arquivoDestino}`);

  return {
    id: slug,
    nome: nomeBase.replace(/_/g, " "),
    categoria: slug.split("-")[0],
    arquivo: arquivoDestino,
  };
});

const conteudo = `import type { ItemBiblioteca } from "./biblioteca-tipos";

export const BIBLIOTECA: ItemBiblioteca[] = ${JSON.stringify(itens, null, 2)};
`;

writeFileSync("lib/biblioteca-dados.ts", conteudo);

console.log(`Migrados ${itens.length} arquivos para ${DESTINO}, manifesto escrito em lib/biblioteca-dados.ts`);
```

- [ ] **Step 7: Rodar o script de migração**

Run: `node scripts/migrar-biblioteca.mjs`
Expected: imprime "Migrados N arquivos..." com N igual à quantidade de imagens em `legado-php/uploads`

- [ ] **Step 8: Conferir a migração**

Run: `ls public/biblioteca/produtos | wc -l` e `ls legado-php/uploads | wc -l`
Expected: os dois números batem (todo arquivo de imagem migrou)

Run: `npx tsc --noEmit`
Expected: sem erros — `lib/biblioteca-dados.ts` gerado é TypeScript válido

- [ ] **Step 9: Commit**

```bash
git add lib/biblioteca-tipos.ts lib/biblioteca.ts lib/biblioteca.test.ts lib/biblioteca-dados.ts scripts/migrar-biblioteca.mjs public/biblioteca/
git commit -m "Adiciona biblioteca de imagens e migra fotos do sistema legado"
```

### Task 14: Compressão de imagem e Etapa 4 (Imagem)

**Files:**
- Create: `lib/imagem.ts`
- Test: `lib/imagem.test.ts`
- Create: `app/criar/imagem/page.tsx`
- Test: `app/criar/imagem/page.test.tsx`

**Interfaces:**
- Consumes: `useWizard()` (Task 7), `BIBLIOTECA` (Task 13), `buscarImagens`/`caminhoImagem` (Task 13), `PRODUTOS` (Task 3)
- Produces: `calcularDimensoesComprimidas(larguraOriginal, alturaOriginal, larguraMaxima)`, `comprimirImagem(arquivo, opcoes?): Promise<string>`, página `/criar/imagem`

- [ ] **Step 1: Escrever o teste de `lib/imagem.ts` (vai falhar)**

Create `lib/imagem.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { calcularDimensoesComprimidas, comprimirImagem } from "./imagem";

describe("calcularDimensoesComprimidas", () => {
  it("mantém as dimensões quando já está dentro do limite", () => {
    expect(calcularDimensoesComprimidas(800, 600, 1600)).toEqual({ largura: 800, altura: 600 });
  });

  it("reduz proporcionalmente quando ultrapassa a largura máxima", () => {
    expect(calcularDimensoesComprimidas(3200, 2400, 1600)).toEqual({ largura: 1600, altura: 1200 });
  });
});

describe("comprimirImagem", () => {
  it("retorna uma data URL JPEG usando as dimensões comprimidas", async () => {
    class ImagemFalsa {
      width = 3200;
      height = 2400;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_valor: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    }
    vi.stubGlobal("Image", ImagemFalsa);

    const contextoFalso = { drawImage: vi.fn() };
    const canvasFalso = {
      width: 0,
      height: 0,
      getContext: () => contextoFalso,
      toDataURL: () => "data:image/jpeg;base64,FALSO",
    };
    vi.spyOn(document, "createElement").mockImplementation((tag: string) =>
      tag === "canvas" ? (canvasFalso as unknown as HTMLCanvasElement) : document.createElement(tag)
    );

    const arquivo = new File(["conteudo"], "foto.jpg", { type: "image/jpeg" });
    const resultado = await comprimirImagem(arquivo, { larguraMaxima: 1600 });

    expect(resultado).toBe("data:image/jpeg;base64,FALSO");
    expect(canvasFalso.width).toBe(1600);
    expect(canvasFalso.height).toBe(1200);

    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});
```

Run: `npx vitest run lib/imagem.test.ts`
Expected: FAIL — `Cannot find module './imagem'`

- [ ] **Step 2: Implementar `lib/imagem.ts`**

```typescript
export function calcularDimensoesComprimidas(
  larguraOriginal: number,
  alturaOriginal: number,
  larguraMaxima: number
): { largura: number; altura: number } {
  if (larguraOriginal <= larguraMaxima) {
    return { largura: larguraOriginal, altura: alturaOriginal };
  }
  const fator = larguraMaxima / larguraOriginal;
  return { largura: larguraMaxima, altura: Math.round(alturaOriginal * fator) };
}

export function comprimirImagem(
  arquivo: File,
  { larguraMaxima = 1600, qualidade = 0.8 }: { larguraMaxima?: number; qualidade?: number } = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(leitor.error);
    leitor.onload = () => {
      const imagem = new Image();
      imagem.onerror = () => reject(new Error("Não foi possível carregar a imagem"));
      imagem.onload = () => {
        const { largura, altura } = calcularDimensoesComprimidas(imagem.width, imagem.height, larguraMaxima);
        const canvas = document.createElement("canvas");
        canvas.width = largura;
        canvas.height = altura;
        const contexto = canvas.getContext("2d");
        if (!contexto) {
          reject(new Error("Canvas 2D não disponível neste navegador"));
          return;
        }
        contexto.drawImage(imagem, 0, 0, largura, altura);
        resolve(canvas.toDataURL("image/jpeg", qualidade));
      };
      imagem.src = leitor.result as string;
    };
    leitor.readAsDataURL(arquivo);
  });
}
```

- [ ] **Step 3: Rodar e confirmar que passa**

Run: `npx vitest run lib/imagem.test.ts`
Expected: PASS (3 testes)

- [ ] **Step 4: Escrever o teste da Etapa 4 (vai falhar)**

Create `app/criar/imagem/page.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WizardProvider } from "@/lib/wizard-context";
import EtapaImagem from "./page";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

vi.mock("@/lib/biblioteca-dados", () => ({
  BIBLIOTECA: [
    { id: "porta-arco", nome: "Porta Balcão Arco", categoria: "porta", arquivo: "porta-arco.jpg" },
    { id: "painel-solido", nome: "Painel Sólido", categoria: "painel", arquivo: "painel-solido.jpg" },
  ],
}));

beforeEach(() => {
  window.localStorage.clear();
  push.mockClear();
});

describe("Etapa Imagem", () => {
  it("filtra a biblioteca ao digitar na busca", async () => {
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <EtapaImagem />
      </WizardProvider>
    );

    expect(screen.getByAltText("Porta Balcão Arco")).toBeInTheDocument();
    expect(screen.getByAltText("Painel Sólido")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/Buscar por nome/), "painel");

    expect(screen.queryByAltText("Porta Balcão Arco")).toBeNull();
    expect(screen.getByAltText("Painel Sólido")).toBeInTheDocument();
  });

  it("escolher uma imagem da biblioteca mostra o preview e permite remover", async () => {
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <EtapaImagem />
      </WizardProvider>
    );

    await user.click(screen.getByAltText("Porta Balcão Arco"));
    expect(screen.getByAltText("Imagem selecionada")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remover imagem" }));
    expect(screen.queryByAltText("Imagem selecionada")).toBeNull();
  });

  it("Próximo avança para a Revisão mesmo sem imagem escolhida", async () => {
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <EtapaImagem />
      </WizardProvider>
    );
    await user.click(screen.getByRole("button", { name: /Próximo/ }));
    expect(push).toHaveBeenCalledWith("/criar/revisao");
  });
});
```

Run: `npx vitest run app/criar/imagem/page.test.tsx`
Expected: FAIL — `Cannot find module './page'`

- [ ] **Step 5: Implementar `app/criar/imagem/page.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useWizard } from "@/lib/wizard-context";
import { StepIndicator } from "@/components/wizard/StepIndicator";
import { PRODUTOS } from "@/produtos";
import { BIBLIOTECA } from "@/lib/biblioteca-dados";
import { buscarImagens, caminhoImagem } from "@/lib/biblioteca";
import { comprimirImagem } from "@/lib/imagem";

export default function EtapaImagem() {
  const { estado, dispatch } = useWizard();
  const router = useRouter();
  const [termoBusca, setTermoBusca] = useState("");
  const [erroUpload, setErroUpload] = useState<string | null>(null);

  useEffect(() => {
    dispatch({ type: "IR_PARA_ETAPA", etapa: "imagem" });
  }, [dispatch]);

  const itensFiltrados = useMemo(() => buscarImagens(BIBLIOTECA, termoBusca), [termoBusca]);
  const config = estado.tipo ? PRODUTOS[estado.tipo] : null;
  const rotaVoltar = config && config.campos.length > 0 ? "/criar/especificacoes" : "/criar/pedido";

  async function aoEscolherArquivo(arquivo: File | undefined) {
    if (!arquivo) return;
    setErroUpload(null);
    try {
      const dataUrl = await comprimirImagem(arquivo);
      dispatch({ type: "DEFINIR_IMAGEM_UPLOAD", dataUrl });
    } catch {
      setErroUpload("Não foi possível processar essa imagem. Tente outro arquivo.");
    }
  }

  const itemBibliotecaSelecionado = BIBLIOTECA.find((item) => item.id === estado.imagem.bibliotecaId);
  const previewSrc =
    estado.imagem.origem === "upload"
      ? estado.imagem.uploadDataUrl
      : itemBibliotecaSelecionado
        ? caminhoImagem(itemBibliotecaSelecionado)
        : null;

  return (
    <div>
      <StepIndicator etapaAtual="imagem" />
      <h1 className="mb-6 text-2xl font-semibold">Imagem do produto</h1>

      {previewSrc && (
        <div className="mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewSrc} alt="Imagem selecionada" className="max-h-48 rounded-md border" />
          <button
            type="button"
            onClick={() => dispatch({ type: "REMOVER_IMAGEM" })}
            className="mt-2 block text-sm text-red-700 underline"
          >
            Remover imagem
          </button>
        </div>
      )}

      <div className="mb-6">
        <label className="mb-1 block text-sm font-medium">Upload de imagem avulsa</label>
        <input type="file" accept="image/*" onChange={(e) => aoEscolherArquivo(e.target.files?.[0])} />
        {erroUpload && <p className="mt-1 text-sm text-red-700">{erroUpload}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Ou escolha da biblioteca</label>
        <input
          type="search"
          placeholder="Buscar por nome ou categoria..."
          value={termoBusca}
          onChange={(e) => setTermoBusca(e.target.value)}
          className="mb-3 w-full rounded-md border px-3 py-2 dark:bg-gray-900"
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {itensFiltrados.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => dispatch({ type: "DEFINIR_IMAGEM_BIBLIOTECA", bibliotecaId: item.id })}
              className={`rounded-md border p-1 ${
                estado.imagem.bibliotecaId === item.id ? "border-red-700" : "border-gray-200 dark:border-gray-700"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={caminhoImagem(item)} alt={item.nome} className="h-24 w-full object-contain" />
              <span className="mt-1 block truncate text-xs">{item.nome}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <button type="button" onClick={() => router.push(rotaVoltar)} className="rounded-md border px-5 py-2">
          ← Voltar
        </button>
        <button
          type="button"
          onClick={() => router.push("/criar/revisao")}
          className="rounded-md bg-red-700 px-5 py-2 text-white"
        >
          Próximo →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Rodar e confirmar que passa**

Run: `npx vitest run app/criar/imagem/page.test.tsx`
Expected: PASS (3 testes)

- [ ] **Step 7: Commit**

```bash
git add lib/imagem.ts lib/imagem.test.ts app/criar/imagem/
git commit -m "Adiciona compressão de imagem e Etapa 4 (Imagem)"
```

### Task 15: `DocumentoCroqui` — o documento final

Reproduz o layout dos formulários físicos da Madel (seção 8 do spec). Usado tanto no preview da Revisão (Task 16) quanto na tela de Resultado (Task 18).

**Files:**
- Create: `components/croqui/DocumentoCroqui.tsx`
- Test: `components/croqui/DocumentoCroqui.test.tsx`

**Interfaces:**
- Consumes: `EstadoPedido` (Task 6), `PRODUTOS` (Task 3), `BIBLIOTECA`/`caminhoImagem` (Task 13), `formatarBufferMedida` (Task 4)
- Produces: `<DocumentoCroqui estado={EstadoPedido} />`

- [ ] **Step 1: Escrever o teste (vai falhar)**

Create `components/croqui/DocumentoCroqui.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DocumentoCroqui } from "./DocumentoCroqui";
import { ESTADO_INICIAL } from "@/lib/pedido";

describe("DocumentoCroqui", () => {
  it("mostra o título e o prazo corretos para esquadria (60 dias)", () => {
    const estado = {
      ...ESTADO_INICIAL,
      tipo: "esquadria" as const,
      pedido: { ...ESTADO_INICIAL.pedido, descricao: "Janela de sala" },
      especificacoes: { altura: "2100", largura: "1200" },
    };
    render(<DocumentoCroqui estado={estado} />);

    expect(screen.getByText("ENCOMENDA ESPECIAL ESQUADRIAS")).toBeInTheDocument();
    expect(screen.getByText(/ATÉ 60 DIAS/)).toBeInTheDocument();
    expect(screen.getByText("Altura: 2,100 m")).toBeInTheDocument();
  });

  it("mostra prazo de 90 dias para porta-acm", () => {
    const estado = { ...ESTADO_INICIAL, tipo: "porta-acm" as const };
    render(<DocumentoCroqui estado={estado} />);
    expect(screen.getByText(/ATÉ 90 DIAS/)).toBeInTheDocument();
  });

  it("Fornecedor e Custo aparecem em branco quando não preenchidos", () => {
    const estado = { ...ESTADO_INICIAL, tipo: "outros" as const };
    render(<DocumentoCroqui estado={estado} />);
    expect(screen.getByText(/Fornecedor: _+/)).toBeInTheDocument();
    expect(screen.getByText(/Custo: _+/)).toBeInTheDocument();
  });

  it("mostra Fornecedor e Custo quando preenchidos (versão para compras)", () => {
    const estado = {
      ...ESTADO_INICIAL,
      tipo: "outros" as const,
      compra: { fornecedor: "Marcenaria XYZ", custo: "R$ 450,00" },
    };
    render(<DocumentoCroqui estado={estado} />);
    expect(screen.getByText("Fornecedor: Marcenaria XYZ")).toBeInTheDocument();
    expect(screen.getByText("Custo: R$ 450,00")).toBeInTheDocument();
  });

  it("tipo Outros não mostra seção de especificações técnicas", () => {
    const estado = { ...ESTADO_INICIAL, tipo: "outros" as const };
    render(<DocumentoCroqui estado={estado} />);
    expect(screen.queryByText("Especificações técnicas")).toBeNull();
  });
});
```

Run: `npx vitest run components/croqui/DocumentoCroqui.test.tsx`
Expected: FAIL — `Cannot find module './DocumentoCroqui'`

- [ ] **Step 2: Implementar `components/croqui/DocumentoCroqui.tsx`**

```tsx
import type { Campo } from "@/produtos/tipos";
import { PRODUTOS } from "@/produtos";
import type { EstadoPedido } from "@/lib/pedido";
import { formatarBufferMedida } from "@/lib/formatacao";
import { caminhoImagem } from "@/lib/biblioteca";
import { BIBLIOTECA } from "@/lib/biblioteca-dados";

type Props = { estado: EstadoPedido };

function valorExibivelCampo(campo: Campo, valorBruto: string | undefined): string {
  if (!valorBruto) return "—";
  if (campo.tipo === "medida") return `${formatarBufferMedida(valorBruto)} ${campo.unidade}`;
  if (campo.tipo === "multipla-escolha") return valorBruto.split("|").join(", ");
  return valorBruto;
}

export function DocumentoCroqui({ estado }: Props) {
  if (!estado.tipo) return null;
  const config = PRODUTOS[estado.tipo];

  const itemBiblioteca = BIBLIOTECA.find((item) => item.id === estado.imagem.bibliotecaId);
  const imagemSrc =
    estado.imagem.origem === "upload"
      ? estado.imagem.uploadDataUrl
      : itemBiblioteca
        ? caminhoImagem(itemBiblioteca)
        : null;

  return (
    <div className="border-2 border-red-800 bg-white text-black" data-testid="documento-croqui">
      <div className="bg-red-800 px-4 py-2 text-lg font-bold text-white">{config.tituloDocumento}</div>

      <div className="grid grid-cols-2 gap-0">
        <div className="border-r border-red-800 p-4 text-sm">
          <div className="mb-3 border border-red-800 p-2">
            <p>Cliente: {estado.pedido.cliente || "—"}</p>
            <p>
              Nº Pedido: {estado.pedido.numeroPedido || "—"} · Data: {estado.pedido.data || "—"} · Vendedor:{" "}
              {estado.pedido.vendedor || "—"} · Loja: {estado.pedido.loja || "—"}
            </p>
          </div>

          <div className="mb-3 border border-red-800 p-2">
            <h2 className="mb-1 font-bold uppercase">Descrição do produto</h2>
            <p>{estado.pedido.descricao || "—"}</p>
          </div>

          {config.campos.length > 0 && (
            <div className="mb-3 border border-red-800 p-2">
              <h2 className="mb-1 font-bold uppercase">Especificações técnicas</h2>
              {config.campos.map((campo) => (
                <p key={campo.id}>
                  {campo.label}: {valorExibivelCampo(campo, estado.especificacoes[campo.id])}
                </p>
              ))}
            </div>
          )}

          <div className="mb-3 bg-red-800 p-2 text-center text-white">
            <h3 className="font-bold">AVISO AO CLIENTE</h3>
            <p>*TODAS AS MEDIDAS E CARACTERÍSTICAS DEVERÃO SER DEVIDAMENTE CONFIRMADAS.</p>
            <p>*NÃO SERÃO ACEITAS, TROCA OU ALTERAÇÃO DE PEÇAS ESPECIAIS.</p>
            <p>*NÃO SERÁ ACEITO CANCELAMENTO, APÓS A APROVAÇÃO DESTE PROJETO.</p>
          </div>

          <div className="mb-3 border border-red-800 p-2 text-center font-bold text-red-800">
            PRAZO DE CHEGADA DE MERCADORIA EM DEPÓSITO ATÉ {config.prazoEntregaDias} DIAS
          </div>

          <div className="mb-3 grid grid-cols-2 gap-4 text-center text-xs">
            <div className="border-t border-black pt-1">ASSINATURA DO CLIENTE</div>
            <div className="border-t border-black pt-1">ASSINATURA DO GERENTE</div>
          </div>

          <div className="border border-red-800 p-2">
            <p>Fornecedor: {estado.compra.fornecedor || "_______________"}</p>
            <p>Custo: {estado.compra.custo || "_______________"}</p>
          </div>
        </div>

        <div className="p-4">
          <div className="mb-2 bg-red-800 p-1 text-center text-sm font-bold text-white">
            DESENHO DA PEÇA ESPECIAL
          </div>
          <div className="flex min-h-[300px] items-center justify-center border border-gray-400 p-6">
            {imagemSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagemSrc} alt="Desenho do produto" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-xs text-gray-400">Sem imagem</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Rodar e confirmar que passa**

Run: `npx vitest run components/croqui/DocumentoCroqui.test.tsx`
Expected: PASS (5 testes)

- [ ] **Step 4: Commit**

```bash
git add components/croqui/DocumentoCroqui.tsx components/croqui/DocumentoCroqui.test.tsx
git commit -m "Adiciona o componente do documento final (DocumentoCroqui)"
```

### Task 16: Etapa 5 (Revisão)

**Files:**
- Create: `app/criar/revisao/page.tsx`
- Test: `app/criar/revisao/page.test.tsx`

**Interfaces:**
- Consumes: `useWizard()` (Task 7), `DocumentoCroqui` (Task 15)

- [ ] **Step 1: Escrever o teste (vai falhar)**

Create `app/criar/revisao/page.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, type ReactNode } from "react";
import { WizardProvider, useWizard } from "@/lib/wizard-context";
import EtapaRevisao from "./page";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function ComTipo({ children }: { children: ReactNode }) {
  const { dispatch } = useWizard();
  useEffect(() => {
    dispatch({ type: "DEFINIR_TIPO", tipo: "outros" });
  }, [dispatch]);
  return <>{children}</>;
}

beforeEach(() => {
  window.localStorage.clear();
  push.mockClear();
});

describe("Etapa Revisão", () => {
  it("mostra o preview do documento e permite preencher Fornecedor/Custo", async () => {
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <ComTipo>
          <EtapaRevisao />
        </ComTipo>
      </WizardProvider>
    );

    expect(screen.getByTestId("documento-croqui")).toBeInTheDocument();
    expect(screen.getByText(/Fornecedor: _+/)).toBeInTheDocument();

    await user.click(screen.getByText(/Informações de compra/));
    await user.type(screen.getByLabelText("Fornecedor"), "Marcenaria XYZ");

    expect(screen.getByText("Fornecedor: Marcenaria XYZ")).toBeInTheDocument();
  });

  it("Gerar Croqui avança para a tela de Resultado", async () => {
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <ComTipo>
          <EtapaRevisao />
        </ComTipo>
      </WizardProvider>
    );
    await user.click(screen.getByRole("button", { name: "Gerar Croqui" }));
    expect(push).toHaveBeenCalledWith("/criar/resultado");
  });
});
```

Run: `npx vitest run app/criar/revisao/page.test.tsx`
Expected: FAIL — `Cannot find module './page'`

- [ ] **Step 2: Implementar `app/criar/revisao/page.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWizard } from "@/lib/wizard-context";
import { StepIndicator } from "@/components/wizard/StepIndicator";
import { DocumentoCroqui } from "@/components/croqui/DocumentoCroqui";

export default function EtapaRevisao() {
  const { estado, dispatch } = useWizard();
  const router = useRouter();

  useEffect(() => {
    dispatch({ type: "IR_PARA_ETAPA", etapa: "revisao" });
  }, [dispatch]);

  function atualizarCompra(campo: keyof typeof estado.compra, valor: string) {
    dispatch({ type: "ATUALIZAR_COMPRA", campo, valor });
  }

  return (
    <div>
      <StepIndicator etapaAtual="revisao" />
      <h1 className="mb-6 text-2xl font-semibold">Revisar encomenda</h1>

      <div className="mb-6 overflow-x-auto">
        <DocumentoCroqui estado={estado} />
      </div>

      <details className="mb-6 rounded-md border p-4">
        <summary className="cursor-pointer font-medium">
          Informações de compra (opcional — deixe em branco para a versão de aprovação do cliente)
        </summary>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Fornecedor</span>
            <input
              className="w-full rounded-md border px-3 py-2 dark:bg-gray-900"
              value={estado.compra.fornecedor}
              onChange={(e) => atualizarCompra("fornecedor", e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Custo</span>
            <input
              className="w-full rounded-md border px-3 py-2 dark:bg-gray-900"
              value={estado.compra.custo}
              onChange={(e) => atualizarCompra("custo", e.target.value)}
            />
          </label>
        </div>
      </details>

      <div className="flex justify-between">
        <button type="button" onClick={() => router.push("/criar/imagem")} className="rounded-md border px-5 py-2">
          ← Voltar
        </button>
        <button
          type="button"
          onClick={() => router.push("/criar/resultado")}
          className="rounded-md bg-red-700 px-5 py-2 text-white"
        >
          Gerar Croqui
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Rodar e confirmar que passa**

Run: `npx vitest run app/criar/revisao/page.test.tsx`
Expected: PASS (2 testes)

- [ ] **Step 4: Commit**

```bash
git add app/criar/revisao/
git commit -m "Adiciona Etapa 5 (Revisão)"
```

### Task 17: `lib/exportar-imagem.ts` e `lib/exportar-pdf.ts`

**Files:**
- Create: `lib/exportar-imagem.ts`
- Test: `lib/exportar-imagem.test.ts`
- Create: `lib/exportar-pdf.ts`
- Test: `lib/exportar-pdf.test.ts`

**Interfaces:**
- Consumes: `html2canvas`, `jspdf` (Task 1)
- Produces: `exportarComoImagem(elemento: HTMLElement, nomeArquivo: string): Promise<void>`, `exportarComoPdf(elemento: HTMLElement, nomeArquivo: string): Promise<void>`

- [ ] **Step 1: Escrever o teste de `exportar-imagem.ts` (vai falhar)**

Create `lib/exportar-imagem.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { exportarComoImagem } from "./exportar-imagem";

vi.mock("html2canvas", () => ({
  default: vi.fn().mockResolvedValue({
    toDataURL: () => "data:image/png;base64,FALSO",
  }),
}));

describe("exportarComoImagem", () => {
  it("cria um link de download com a imagem gerada e clica nele", async () => {
    const elemento = document.createElement("div");
    const cliqueSimulado = vi.fn();
    const criarElementoOriginal = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "a") {
        const link = criarElementoOriginal("a");
        link.click = cliqueSimulado;
        return link;
      }
      return criarElementoOriginal(tag);
    });

    await exportarComoImagem(elemento, "croqui.png");

    expect(cliqueSimulado).toHaveBeenCalledOnce();
    vi.restoreAllMocks();
  });
});
```

Run: `npx vitest run lib/exportar-imagem.test.ts`
Expected: FAIL — `Cannot find module './exportar-imagem'`

- [ ] **Step 2: Implementar `lib/exportar-imagem.ts`**

```typescript
import html2canvas from "html2canvas";

export async function exportarComoImagem(elemento: HTMLElement, nomeArquivo: string): Promise<void> {
  const canvas = await html2canvas(elemento, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
  const link = document.createElement("a");
  link.download = nomeArquivo;
  link.href = canvas.toDataURL("image/png", 1.0);
  link.click();
}
```

- [ ] **Step 3: Rodar e confirmar que passa**

Run: `npx vitest run lib/exportar-imagem.test.ts`
Expected: PASS

- [ ] **Step 4: Escrever o teste de `exportar-pdf.ts` (vai falhar)**

Create `lib/exportar-pdf.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { exportarComoPdf } from "./exportar-pdf";

vi.mock("html2canvas", () => ({
  default: vi.fn().mockResolvedValue({
    width: 1000,
    height: 500,
    toDataURL: () => "data:image/png;base64,FALSO",
  }),
}));

const salvarMock = vi.fn();
const adicionarImagemMock = vi.fn();

vi.mock("jspdf", () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    internal: { pageSize: { getWidth: () => 297, getHeight: () => 210 } },
    addImage: adicionarImagemMock,
    save: salvarMock,
  })),
}));

describe("exportarComoPdf", () => {
  it("gera o PDF com a imagem centralizada e salva com o nome informado", async () => {
    const elemento = document.createElement("div");
    await exportarComoPdf(elemento, "croqui.pdf");

    expect(adicionarImagemMock).toHaveBeenCalledWith(
      "data:image/png;base64,FALSO",
      "PNG",
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number)
    );
    expect(salvarMock).toHaveBeenCalledWith("croqui.pdf");
  });
});
```

Run: `npx vitest run lib/exportar-pdf.test.ts`
Expected: FAIL — `Cannot find module './exportar-pdf'`

- [ ] **Step 5: Implementar `lib/exportar-pdf.ts`**

```typescript
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export async function exportarComoPdf(elemento: HTMLElement, nomeArquivo: string): Promise<void> {
  const canvas = await html2canvas(elemento, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
  const pdf = new jsPDF("l", "mm", "a4");
  const larguraPdf = pdf.internal.pageSize.getWidth();
  const alturaPdf = pdf.internal.pageSize.getHeight();
  const razao = Math.min(larguraPdf / canvas.width, alturaPdf / canvas.height);
  const largura = canvas.width * razao;
  const altura = canvas.height * razao;
  const x = (larguraPdf - largura) / 2;
  const y = (alturaPdf - altura) / 2;

  const imagemDataUrl = canvas.toDataURL("image/png", 1.0);
  pdf.addImage(imagemDataUrl, "PNG", x, y, largura, altura);
  pdf.save(nomeArquivo);
}
```

- [ ] **Step 6: Rodar e confirmar que passa**

Run: `npx vitest run lib/exportar-pdf.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add lib/exportar-imagem.ts lib/exportar-imagem.test.ts lib/exportar-pdf.ts lib/exportar-pdf.test.ts
git commit -m "Adiciona wrappers de exportação para PDF e Imagem"
```

### Task 18: Tela de Resultado — Baixar PDF / Baixar Imagem

**Files:**
- Create: `app/criar/resultado/page.tsx`
- Test: `app/criar/resultado/page.test.tsx`

**Interfaces:**
- Consumes: `useWizard()` (Task 7), `DocumentoCroqui` (Task 15), `exportarComoPdf`/`exportarComoImagem` (Task 17)

- [ ] **Step 1: Escrever o teste (vai falhar)**

Create `app/criar/resultado/page.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, type ReactNode } from "react";
import { WizardProvider, useWizard } from "@/lib/wizard-context";
import EtapaResultado from "./page";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const exportarComoPdfMock = vi.fn().mockResolvedValue(undefined);
const exportarComoImagemMock = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/exportar-pdf", () => ({ exportarComoPdf: (...args: unknown[]) => exportarComoPdfMock(...args) }));
vi.mock("@/lib/exportar-imagem", () => ({
  exportarComoImagem: (...args: unknown[]) => exportarComoImagemMock(...args),
}));

function ComTipo({ children }: { children: ReactNode }) {
  const { dispatch } = useWizard();
  useEffect(() => {
    dispatch({ type: "DEFINIR_TIPO", tipo: "outros" });
  }, [dispatch]);
  return <>{children}</>;
}

beforeEach(() => {
  window.localStorage.clear();
  push.mockClear();
  exportarComoPdfMock.mockClear();
  exportarComoImagemMock.mockClear();
});

describe("Etapa Resultado", () => {
  it("Baixar PDF chama exportarComoPdf com o nome do arquivo esperado", async () => {
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <ComTipo>
          <EtapaResultado />
        </ComTipo>
      </WizardProvider>
    );

    await user.click(screen.getByRole("button", { name: "Baixar PDF" }));

    await waitFor(() => expect(exportarComoPdfMock).toHaveBeenCalledTimes(1));
    expect(exportarComoPdfMock.mock.calls[0][1]).toBe("encomenda-especial-outros.pdf");
  });

  it("Baixar Imagem chama exportarComoImagem com o nome do arquivo esperado", async () => {
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <ComTipo>
          <EtapaResultado />
        </ComTipo>
      </WizardProvider>
    );

    await user.click(screen.getByRole("button", { name: "Baixar Imagem" }));

    await waitFor(() => expect(exportarComoImagemMock).toHaveBeenCalledTimes(1));
    expect(exportarComoImagemMock.mock.calls[0][1]).toBe("encomenda-especial-outros.png");
  });

  it("mostra mensagem de erro quando a exportação falha", async () => {
    exportarComoPdfMock.mockRejectedValueOnce(new Error("falhou"));
    const user = userEvent.setup();
    render(
      <WizardProvider>
        <ComTipo>
          <EtapaResultado />
        </ComTipo>
      </WizardProvider>
    );

    await user.click(screen.getByRole("button", { name: "Baixar PDF" }));

    expect(await screen.findByText(/Não foi possível gerar o PDF/)).toBeInTheDocument();
  });
});
```

Run: `npx vitest run app/criar/resultado/page.test.tsx`
Expected: FAIL — `Cannot find module './page'`

- [ ] **Step 2: Implementar `app/criar/resultado/page.tsx`**

```tsx
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useWizard } from "@/lib/wizard-context";
import { DocumentoCroqui } from "@/components/croqui/DocumentoCroqui";
import { exportarComoPdf } from "@/lib/exportar-pdf";
import { exportarComoImagem } from "@/lib/exportar-imagem";

export default function EtapaResultado() {
  const { estado } = useWizard();
  const router = useRouter();
  const referenciaDocumento = useRef<HTMLDivElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);

  async function baixarPdf() {
    if (!referenciaDocumento.current) return;
    setErro(null);
    setExportando(true);
    try {
      await exportarComoPdf(referenciaDocumento.current, `encomenda-especial-${estado.tipo}.pdf`);
    } catch {
      setErro("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setExportando(false);
    }
  }

  async function baixarImagem() {
    if (!referenciaDocumento.current) return;
    setErro(null);
    setExportando(true);
    try {
      await exportarComoImagem(referenciaDocumento.current, `encomenda-especial-${estado.tipo}.png`);
    } catch {
      setErro("Não foi possível gerar a imagem. Tente novamente.");
    } finally {
      setExportando(false);
    }
  }

  if (!estado.tipo) {
    return (
      <div>
        <p className="mb-4">Nenhuma encomenda em andamento.</p>
        <button type="button" onClick={() => router.push("/criar/tipo")} className="rounded-md border px-5 py-2">
          Começar
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Encomenda gerada</h1>

      <div ref={referenciaDocumento} className="mb-6 overflow-x-auto">
        <DocumentoCroqui estado={estado} />
      </div>

      {erro && <p className="mb-4 text-sm text-red-700">{erro}</p>}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={exportando}
          onClick={baixarPdf}
          className="rounded-md bg-red-700 px-5 py-2 text-white disabled:opacity-40"
        >
          Baixar PDF
        </button>
        <button
          type="button"
          disabled={exportando}
          onClick={baixarImagem}
          className="rounded-md bg-red-700 px-5 py-2 text-white disabled:opacity-40"
        >
          Baixar Imagem
        </button>
        <button type="button" onClick={() => router.push("/criar/revisao")} className="rounded-md border px-5 py-2">
          ← Voltar para Revisão
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Rodar e confirmar que passa**

Run: `npx vitest run app/criar/resultado/page.test.tsx`
Expected: PASS (3 testes)

- [ ] **Step 4: Commit**

```bash
git add app/criar/resultado/
git commit -m "Adiciona tela de Resultado com exportação de PDF e Imagem"
```

### Task 19: Página inicial, CLAUDE.md da v1 e verificação final ponta a ponta

**Files:**
- Create: `app/page.tsx`
- Test: `app/page.test.tsx`
- Create: `CLAUDE.md` (o antigo já foi movido para `legado-php/CLAUDE.md` na Task 1 — este é um arquivo novo na raiz, descrevendo a arquitetura Next.js)

**Interfaces:**
- Consumes: tudo das Tasks 1–18

- [ ] **Step 1: Escrever o teste da página inicial (vai falhar)**

Create `app/page.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "./page";

describe("Página inicial", () => {
  it("tem um link para começar uma nova encomenda", () => {
    render(<Home />);
    const link = screen.getByRole("link", { name: /Nova encomenda/ });
    expect(link).toHaveAttribute("href", "/criar/tipo");
  });
});
```

Run: `npx vitest run app/page.test.tsx`
Expected: FAIL — `Cannot find module './page'` (ou falha porque `app/page.tsx` ainda é o placeholder do `create-next-app`)

- [ ] **Step 2: Implementar `app/page.tsx`**

```tsx
import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="mb-4 text-3xl font-semibold">Produto Coringa</h1>
      <p className="mb-8 text-gray-600 dark:text-gray-300">
        Gere a encomenda especial de portas, esquadrias e outros produtos sob medida da Madel.
      </p>
      <Link href="/criar/tipo" className="rounded-md bg-red-700 px-6 py-3 text-white">
        Nova encomenda
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: Rodar e confirmar que passa**

Run: `npx vitest run app/page.test.tsx`
Expected: PASS

- [ ] **Step 4: Escrever o novo `CLAUDE.md` da raiz, descrevendo a v1 em Next.js**

Create `CLAUDE.md`:

```markdown
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
```

- [ ] **Step 5: Rodar a suíte completa de testes**

Run: `npm test`
Expected: todos os testes de todas as Tasks (1–19) passam

- [ ] **Step 6: Rodar o build de produção**

Run: `npm run build`
Expected: build completo sem erros de TypeScript/ESLint

- [ ] **Step 7: Smoke test manual no navegador**

Run: `npm run dev` e, em `http://localhost:3000`, percorrer manualmente:
1. Clicar em "Nova encomenda" → escolher "Esquadrias Encomenda" → preencher Pedido → preencher Altura/Largura em Especificações → pular Imagem → na Revisão, clicar em "Gerar Croqui" sem preencher Fornecedor/Custo → conferir que o documento mostra as linhas em branco → clicar em "Baixar PDF" e "Baixar Imagem" e confirmar que os arquivos baixam corretamente.
2. Fechar a aba no meio do preenchimento de Especificações, reabrir `http://localhost:3000/criar/tipo` e confirmar que aparece o aviso de rascunho e que "Continuar" volta para onde parou.
3. Escolher o tipo "Outros" e confirmar que a Etapa de Especificações é pulada automaticamente.
4. Alternar o tema claro/escuro no cabeçalho e confirmar que o documento gerado continua sempre no visual fixo vermelho/branco/grafite.

- [ ] **Step 8: Commit final**

```bash
git add app/page.tsx app/page.test.tsx CLAUDE.md
git commit -m "Adiciona página inicial, CLAUDE.md da v1 e fecha a reescrita do wizard"
```

