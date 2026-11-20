# Login de vendedores e croquis salvos — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vendedores entram com usuário e senha, croquis são salvos automaticamente a cada "Próximo" e reabertos em "Meus croquis"; o admin gerencia contas, vê todos os croquis e configura a limpeza automática.

**Architecture:** Postgres da Neon acessado direto (SQL, sem ORM) por `lib/servidor/banco.ts`. Sessão em cookie JWT assinado (`jose`) com senhas em scrypt (`node:crypto`). Rotas de API em `app/api/*` conferem sessão e dono no servidor; `proxy.ts` só redireciona páginas para `/login`. O `WizardProvider` ganha `salvarAgora()` (serializado) usado pelos botões "Próximo".

**Tech Stack:** Next 16.4 (App Router), React 19, `@neondatabase/serverless`, `jose`, Vitest; dev: `@electric-sql/pglite` (Postgres em memória nos testes), `tsx` (script de preparação).

**Spec:** `docs/superpowers/specs/2026-11-20-login-persistencia-design.md`

## Global Constraints

- Nomes de variáveis, funções, componentes e textos de interface em português; medidas continuam formatadas só por `lib/formatacao.ts` (nada muda nisso).
- Dependências novas permitidas: `@neondatabase/serverless`, `jose`; dev: `@electric-sql/pglite`, `tsx`. Nada de ORM, bcrypt ou biblioteca de auth.
- Variáveis de ambiente: `DATABASE_URL`, `SESSAO_SEGREDO` (≥ 32 caracteres), `CRON_SECRET`, `ADMIN_USUARIO`, `ADMIN_SENHA` (só no script). Nenhum valor no repositório nem em log.
- Sessão: cookie `sessao`, `httpOnly`, `sameSite=lax`, `secure` em produção, expira em 7 dias.
- Limite padrão de croquis por vendedor: **100**; limpeza apaga só croquis, nunca contas, sem lixeira.
- Limite de tentativas de login: 5 falhas por usuário e 30 por IP em 15 minutos (o IP é maior porque a loja inteira pode sair por um IP só).
- Senha nunca em log, resposta de API ou erro. Mensagem de login inválido é a mesma para usuário inexistente, senha errada e conta desativada: "Usuário ou senha inválidos".
- Corpo do croqui salvo: máximo 4.000.000 bytes (limite da Vercel é ~4,5 MB).
- Testes de rota/biblioteca de servidor começam com `// @vitest-environment node` e usam PGlite via `definirConsulta`, nunca a Neon real.
- Todo acesso a croqui filtra pelo `usuario_id` da sessão; o admin é a única exceção (leitura/exclusão). Croqui de outro vendedor devolve 404, nunca 403.
- Commits em português, terminando com `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Vendedor pede, salva por cima ou exclui o croqui de outro por id → 404 e nada alterado (Task 5).
2. Usuário desativado com cookie ainda válido → a próxima chamada de API já devolve 401 (Task 4).
3. A loja inteira no mesmo IP: 6 falhas de um usuário bloqueiam só aquele usuário, não os outros 129 (Task 3).
4. Croqui com imagens grandes passa de 4 MB: o servidor responde 413, o app mostra aviso, a navegação segue e o rascunho local continua intacto (Tasks 5 e 6).
5. Resposta lenta do salvamento chega depois de "Começar nova" não grava o id no croqui novo, e dois "Próximo" seguidos não criam dois registros (Task 6).

---

### Task 1: Banco, esquema e banco de testes

**Files:**
- Create: `lib/servidor/banco.ts`, `lib/servidor/esquema.ts`, `lib/servidor/banco-teste.ts`, `lib/servidor/banco.test.ts`
- Modify: `package.json` (dependências), `.env.example`

**Interfaces:**
- Produces: `consultar<T = Record<string, unknown>>(texto: string, parametros?: unknown[]): Promise<T[]>`; `definirConsulta(fn: typeof consultar | null): void` (só testes); `COMANDOS_ESQUEMA: string[]` (um comando SQL por item); `criarBancoDeTeste(): Promise<typeof consultar>` (PGlite em memória, já com o esquema aplicado).

- [ ] **Step 1: Instalar** `npm i @neondatabase/serverless jose` e `npm i -D @electric-sql/pglite tsx`.
- [ ] **Step 2: Teste** `banco.test.ts`: `criarBancoDeTeste()` aplica o esquema e `consultar("INSERT INTO usuarios (usuario, nome, senha_hash) VALUES ($1,$2,$3) RETURNING id", ["ana","Ana","x"])` devolve `[{id: 1}]`; inserir `usuario` repetido lança erro; apagar um usuário apaga seus croquis (`ON DELETE CASCADE`).
- [ ] **Step 3: Rodar** `npx vitest run lib/servidor/banco.test.ts` → FAIL (módulos inexistentes).
- [ ] **Step 4: Implementar.** `COMANDOS_ESQUEMA` cria, com `IF NOT EXISTS`: `usuarios(id SERIAL PK, usuario TEXT UNIQUE NOT NULL, nome TEXT NOT NULL, senha_hash TEXT NOT NULL, admin BOOLEAN NOT NULL DEFAULT false, ativo BOOLEAN NOT NULL DEFAULT true, criado_em TIMESTAMPTZ NOT NULL DEFAULT now())`; `croquis(id SERIAL PK, usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, cliente TEXT NOT NULL DEFAULT '', cliente_busca TEXT NOT NULL DEFAULT '', numero_pedido TEXT NOT NULL DEFAULT '', tipo TEXT NOT NULL, estado JSONB NOT NULL, criado_em TIMESTAMPTZ NOT NULL DEFAULT now(), atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now())` + índice `(usuario_id, atualizado_em DESC)`; `configuracoes(chave TEXT PK, valor JSONB NOT NULL)`; `tentativas_login(chave TEXT PK, falhas INT NOT NULL, desde TIMESTAMPTZ NOT NULL)`. `consultar` usa `neon(process.env.DATABASE_URL).query(texto, parametros)` (confirme o nome do método na versão instalada) e lança erro claro se a variável faltar; `definirConsulta` troca a implementação.
- [ ] **Step 5: Rodar** o teste → PASS. Acrescentar a `.env.example` as variáveis (vazias, com um comentário de uma linha cada).
- [ ] **Step 6: Commit** `Banco: conexão Neon, esquema e banco de testes em memória`.

### Task 2: Senha e sessão

**Files:**
- Create: `lib/servidor/senha.ts`, `lib/servidor/sessao.ts`, `lib/servidor/senha.test.ts`, `lib/servidor/sessao.test.ts`

**Interfaces:**
- Produces: `hashSenha(senha: string): Promise<string>` (formato `scrypt$<salt hex>$<hash hex>`); `conferirSenha(senha: string, hash: string): Promise<boolean>` (tempo constante, `false` para hash malformado); `type UsuarioSessao = { id: number; usuario: string; nome: string; admin: boolean }`; `COOKIE_SESSAO = "sessao"`; `criarSessao(u: UsuarioSessao): Promise<string>` (JWT HS256, 7 dias); `lerSessao(token: string | undefined): Promise<UsuarioSessao | null>`; `opcoesCookieSessao(): { httpOnly: true; sameSite: "lax"; secure: boolean; path: "/"; maxAge: number }`.

- [ ] **Step 1: Testes.** Senha: `hashSenha("abc")` ≠ `hashSenha("abc")` (salt), `conferirSenha("abc", h)` true, `conferirSenha("abd", h)` false, `conferirSenha("abc", "lixo")` false. Sessão: ida e volta devolve o mesmo `UsuarioSessao`; token adulterado, expirado (use `vi.setSystemTime`) e `undefined` → `null`; sem `SESSAO_SEGREDO` (ou < 32 caracteres) `criarSessao` lança.
- [ ] **Step 2:** rodar → FAIL. **Step 3:** implementar com `node:crypto` (`scrypt`, `randomBytes`, `timingSafeEqual`) e `jose` (`SignJWT`, `jwtVerify`); o segredo vem de `process.env.SESSAO_SEGREDO` lido a cada chamada. **Step 4:** rodar → PASS.
- [ ] **Step 5: Commit** `Senha com scrypt e sessão em JWT`.

### Task 3: Usuários, tentativas de login e rotas de sessão

**Files:**
- Create: `lib/servidor/usuarios.ts`, `lib/servidor/tentativas.ts`, `lib/servidor/cookies.ts`, `app/api/login/route.ts`, `app/api/logout/route.ts`, `app/api/eu/route.ts` e um `.test.ts` ao lado de cada (`identificarCliente` já existe em `lib/servidor/protecao.ts`)

**Interfaces:**
- Consumes: Task 1 (`consultar`), Task 2 (`hashSenha`, `conferirSenha`, `criarSessao`, `lerSessao`, `COOKIE_SESSAO`, `opcoesCookieSessao`).
- Produces: `type Usuario = UsuarioSessao & { ativo: boolean; criadoEm: string }`; `criarUsuario(d: { usuario: string; nome: string; senha: string; admin?: boolean }): Promise<Usuario>` (usuário normalizado: minúsculo, só `[a-z0-9._-]`, 3–30 caracteres, senha ≥ 8; viola → lança `ErroValidacao`); `buscarPorUsuario(usuario: string): Promise<(Usuario & { senhaHash: string }) | null>`; `buscarPorId(id: number): Promise<Usuario | null>`; `listarUsuarios(): Promise<Usuario[]>`; `trocarSenha(id: number, senha: string): Promise<void>`; `definirAtivo(id: number, ativo: boolean): Promise<void>`; `class ErroValidacao extends Error`; `tentativasEsgotadas(chave: string, limite: number): Promise<boolean>`, `registrarFalha(chave: string): Promise<void>`, `limparTentativas(chave: string): Promise<void>` (janela de 15 min); `lerCookie(req: Request, nome: string): string | undefined` em `lib/servidor/cookies.ts`.
- Rotas: `POST /api/login {usuario, senha}` → 200 `{usuario, nome, admin}` + cookie; 401 `{erro:"Usuário ou senha inválidos"}`; 429 quando bloqueado. `POST /api/logout` → 200 e cookie apagado. `GET /api/eu` → 200 `{usuario, nome, admin}` (confere sessão **e** `ativo` no banco) ou 401.

- [ ] **Step 1: Testes** (PGlite). Usuários: `criarUsuario` normaliza `" Ana.Souza "` → `"ana.souza"`; rejeita senha de 7 caracteres e usuário com espaço; `buscarPorUsuario` é case-insensitive; `definirAtivo(id,false)` reflete em `buscarPorId`. Tentativas: 5 falhas → `tentativasEsgotadas("u:ana", 5)` true e `("u:bia", 5)` false; falha com `desde` de 16 min atrás reinicia a contagem. Login: credenciais certas → 200 + `Set-Cookie` com `HttpOnly`; senha errada, usuário inexistente e conta desativada → o mesmo 401 e a mesma mensagem; 6ª falha de `ana` → 429 e `bia` ainda entra; 31 falhas do mesmo IP (`x-forwarded-for`) → 429; login certo limpa as falhas do usuário. `/api/eu` com cookie de conta desativada → 401.
- [ ] **Step 2:** rodar → FAIL. **Step 3:** implementar. Login confere senha contra um hash falso quando o usuário não existe (tempo similar). Chaves de tentativa: `u:<usuario>` (limite 5) e `ip:<ip>` (limite 30), IP via `identificarCliente` de `protecao.ts`. **Step 4:** rodar → PASS.
- [ ] **Step 5: Commit** `Usuários, limite de tentativas e rotas de login/logout`.

### Task 4: Proteção das rotas, proxy e tela de login

**Files:**
- Modify: `lib/servidor/protecao.ts`, `app/layout.tsx` (o `app/api/gerar-imagem/route.test.ts` já mocka `verificarAcesso` e não muda)
- Create: `proxy.ts`, `proxy.test.ts`, `app/login/page.tsx`, `app/login/page.test.tsx`, `components/ui/MenuUsuario.tsx`, `components/ui/MenuUsuario.test.tsx`, `lib/usuario-cliente.ts`, `lib/servidor/protecao.test.ts`

**Interfaces:**
- Consumes: Tasks 2–3.
- Produces: `exigirUsuario(req: Request): Promise<{ ok: true; usuario: UsuarioSessao } | { ok: false; resposta: Response }>` (JWT válido **e** conta ativa no banco; senão 401 `{erro:"Faça login para continuar."}`); `exigirAdmin(req)` (igual, mas 403 se não admin); `verificarAcesso` passa a usar `exigirUsuario` e devolve `{ permitido: false, status: 401, mensagem }` sem sessão; `proxy(req: NextRequest)` redireciona para `/login` páginas sem JWT válido (exceto `/login`, `/_next`, `/marca`, `/biblioteca`, `favicon.ico` e `/api/*`, que se protegem sozinhas); `useUsuario(): { usuario: { usuario: string; nome: string; admin: boolean } | null; carregando: boolean }` e `sair(): Promise<void>` (chama `/api/logout`, `limparRascunho()`, vai para `/login`).

- [ ] **Step 1: Testes.** `protecao`: sem cookie → 401; cookie válido de conta ativa → ok; cookie válido de conta **desativada** → 401; `exigirAdmin` com vendedor → 403. `proxy`: sem cookie em `/criar/tipo` → redireciona para `/login`; com cookie válido passa; `/login` sempre passa. Login (UI): enviar usuário/senha chama `POST /api/login` e vai para `/criar/tipo`; erro 401 mostra "Usuário ou senha inválidos"; 429 mostra aviso de muitas tentativas. `MenuUsuario`: mostra o nome, link "Meus croquis" (`/criar/croquis`), link "Admin" só para admin, e "Sair" chama `sair()` e remove a chave `produto-coringa:rascunho` do `localStorage`.
- [ ] **Step 2:** rodar → FAIL. **Step 3:** implementar; `MenuUsuario` entra no header de `app/layout.tsx` ao lado do `ThemeToggle` (renderiza nada em `/login`). Página de login segue o estilo existente (Tailwind, botão `bg-red-700`). **Step 4:** rodar a suíte inteira (`npm test`) → PASS.
- [ ] **Step 5: Commit** `Login obrigatório: proxy, proteção das rotas e tela de login`.

### Task 5: Croquis no servidor

**Files:**
- Create: `lib/servidor/croquis.ts`, `lib/servidor/croquis.test.ts`, `app/api/croquis/route.ts`, `app/api/croquis/[id]/route.ts` e testes ao lado

**Interfaces:**
- Consumes: Task 1, `exigirUsuario` (Task 4), `PRODUTOS` de `@/produtos`.
- Produces: `normalizarBusca(texto: string): string` (minúsculo, sem acento); `salvarCroqui(u: UsuarioSessao, d: { id?: number; estado: unknown }): Promise<{ id: number } | null>` (`null` = id informado não é do usuário; `ErroValidacao` se `estado.tipo` não existir em `PRODUTOS` ou o JSON passar de 4.000.000 bytes); `listarCroquis(u, f: { busca?: string; pagina?: number; vendedorId?: number }): Promise<{ itens: ItemCroqui[]; total: number }>` com `ItemCroqui = { id: number; cliente: string; numeroPedido: string; tipo: string; atualizadoEm: string; vendedor: { id: number; nome: string } }`, 20 por página, mais recentes primeiro, `vendedorId` só vale para admin, vendedor comum sempre vê só os seus; `obterCroqui(u, id): Promise<{ id: number; usuarioId: number; estado: unknown } | null>`; `excluirCroqui(u, id): Promise<boolean>` (dono ou admin).
- Rotas: `POST /api/croquis {id?, estado}` → 200 `{id}`, 404 se id alheio, 400 inválido, 413 grande demais; `GET /api/croquis?busca&pagina&vendedor` → `{itens,total}`; `GET /api/croquis/:id` → `{id, usuarioId, estado}` ou 404; `DELETE /api/croquis/:id` → 204 ou 404.

- [ ] **Step 1: Testes** (duas contas `ana`, `bia` e um admin). `ana` salva → `{id}`; segundo `salvarCroqui` com o mesmo id atualiza (continua 1 linha, `atualizado_em` avança); `bia` salvando com o id de `ana` → `null` e a linha de `ana` intacta; `bia` `obterCroqui` e `excluirCroqui` do id de `ana` → `null`/`false`; admin obtém e exclui qualquer um; `listarCroquis` de `bia` não traz os de `ana`, mesmo passando `vendedorId` de `ana`; admin filtra por `vendedorId`; busca `"jose"` acha cliente `"José Álvares"`; `tipo` inexistente → `ErroValidacao`; estado de 4.000.001 bytes → `ErroValidacao` e rota devolve 413; sem sessão → 401.
- [ ] **Step 2:** rodar → FAIL. **Step 3:** implementar; `cliente` e `numero_pedido` vêm de `estado.pedido` (cortados em 200 caracteres), `cliente_busca = normalizarBusca(cliente)`, `estado` gravado com `$n::jsonb`; a busca usa `LIKE '%' || $n || '%'` em `cliente_busca`. **Step 4:** rodar → PASS.
- [ ] **Step 5: Commit** `Croquis salvos: banco e API com isolamento por vendedor`.

### Task 6: Salvamento automático no assistente

**Files:**
- Modify: `lib/pedido.ts` (`croquiId: number | null` em `EstadoPedido` e `ESTADO_INICIAL`), `lib/wizard-context.tsx`, `lib/wizard-storage.ts` (nada se o spread de `ESTADO_INICIAL` já cobre rascunhos antigos), `app/criar/layout.tsx`, `app/criar/pedido/page.tsx`, `app/criar/especificacoes/page.tsx`, `app/criar/imagem/page.tsx`, `app/criar/revisao/page.tsx`, `app/criar/resultado/page.tsx` e seus testes
- Create: `lib/croquis-cliente.ts`, `lib/croquis-cliente.test.ts`, `components/wizard/IndicadorSalvamento.tsx`

**Interfaces:**
- Consumes: `POST /api/croquis` (Task 5).
- Produces: `salvarCroquiNoServidor(estado: EstadoPedido): Promise<number>` (lança `ErroSalvamento` com `status` e `mensagem`; 413 → "Croqui grande demais para salvar na nuvem (muitas imagens). Reduza as imagens coladas."; 401 → "Sua sessão expirou. Entre novamente."); ação `{ type: "DEFINIR_CROQUI_ID"; id: number | null }`; `useWizard()` passa a devolver também `salvarAgora(): Promise<void>` e `statusSalvamento: "ocioso" | "salvando" | "salvo" | "erro"` e `mensagemSalvamento: string | null`.

- [ ] **Step 1: Testes** (provider com `fetch` mockado). `salvarAgora` sem cliente preenchido não chama o servidor; com cliente chama `POST /api/croquis` com `{id: null→omitido, estado}` e guarda o id devolvido em `estado.croquiId`; a chamada seguinte envia esse id; **dois `salvarAgora()` disparados juntos produzem uma única criação** (o segundo espera o primeiro e então atualiza); resposta que chega depois de `REINICIAR` ou `CARREGAR_ESTADO` não altera o `croquiId` do estado novo; falha de rede/413/401 deixa `statusSalvamento: "erro"` com a mensagem e não lança; `REINICIAR` zera `croquiId`. Páginas: clicar "Próximo" em Pedido, Especificações, Imagem e Revisão chama `salvarAgora` **e navega mesmo se ele falhar**; Resultado tem botão "Salvar" que chama `salvarAgora` e mostra "Salvo" ou o erro; Tipo (primeira etapa) não salva.
- [ ] **Step 2:** rodar → FAIL. **Step 3:** implementar. `salvarAgora` lê o estado mais recente de um `ref`, encadeia numa fila (promessa anterior) para serializar, e descarta o resultado se um contador de "geração" (incrementado em `REINICIAR`/`CARREGAR_ESTADO`) mudou. `IndicadorSalvamento` (texto pequeno: "Salvando…", "Salvo", ou o aviso de erro) fica no `CriarLayout`. Os handlers fazem `void salvarAgora(); router.push(...)`. O rascunho local continua sendo gravado como hoje. **Step 4:** rodar `npm test` → PASS.
- [ ] **Step 5: Commit** `Salvamento automático do croqui a cada Próximo, com botão Salvar no Resultado`.

### Task 7: Meus croquis

**Files:**
- Create: `app/criar/croquis/page.tsx`, `app/criar/croquis/page.test.tsx`

**Interfaces:**
- Consumes: `GET /api/croquis`, `GET/DELETE /api/croquis/:id`, `useUsuario` (Task 4), `useWizard`.
- Produces: página `/criar/croquis`: busca por cliente (com atraso de ~300 ms), lista paginada (cliente, nº do pedido, tipo, data; para admin também o vendedor e um filtro por vendedor), "Abrir" e "Excluir" (com confirmação). Aviso fixo com a regra de limpeza vigente: "Mantemos os croquis mais recentes de cada vendedor; os mais antigos são apagados automaticamente."

- [ ] **Step 1: Testes** (`fetch` mockado). Lista os itens devolvidos; digitar na busca refaz a chamada com `busca`; admin vê a coluna "Vendedor" e o filtro, vendedor comum não; "Abrir" de croqui próprio carrega o estado com `croquiId` = id e `ultimaEtapa: "revisao"` e navega para `/criar/revisao`; "Abrir" de croqui de outro vendedor (admin) carrega com `croquiId: null` (cópia); "Excluir" só chama `DELETE` depois de confirmar e remove o item da lista; erro de rede mostra mensagem.
- [ ] **Step 2:** rodar → FAIL. **Step 3:** implementar, navegando só depois do estado ser aplicado (mesmo padrão com `useEffect` de `DraftRecoveryPrompt`). **Step 4:** rodar → PASS.
- [ ] **Step 5: Commit** `Tela Meus croquis: busca, abrir e excluir`.

### Task 8: Painel do admin — contas

**Files:**
- Create: `app/api/admin/usuarios/route.ts`, `app/api/admin/usuarios/[id]/route.ts`, `app/admin/page.tsx` e testes ao lado

**Interfaces:**
- Consumes: `exigirAdmin`, `criarUsuario`, `listarUsuarios`, `trocarSenha`, `definirAtivo` (Tasks 3–4).
- Produces: `GET /api/admin/usuarios` → `Usuario[]` (nunca com `senhaHash`); `POST /api/admin/usuarios {usuario, nome, senha, admin?}` → 201 ou 400 (`ErroValidacao`) ou 409 (usuário já existe); `PATCH /api/admin/usuarios/:id {senha?} | {ativo?}` → 204. O admin não pode desativar a si mesmo (400). Página `/admin` (só admin; vendedor é redirecionado a `/criar/tipo`): tabela de contas, formulário "Nova conta", "Trocar senha" e "Ativar/Desativar".

- [ ] **Step 1: Testes.** Vendedor comum → 403 em todas as rotas; admin cria conta, lista sem `senhaHash`; usuário duplicado → 409; senha curta → 400; trocar a senha faz o login com a nova passar e a antiga falhar; desativar impede novo login e derruba a sessão existente (Review Focus 2); admin desativando a si mesmo → 400; UI: formulário cria conta e atualiza a tabela, botão desativar chama `PATCH`.
- [ ] **Step 2:** rodar → FAIL. **Step 3:** implementar. **Step 4:** rodar → PASS.
- [ ] **Step 5: Commit** `Painel do admin: criar contas, trocar senha e desativar`.

### Task 9: Limpeza automática

**Files:**
- Create: `lib/servidor/limpeza.ts`, `lib/servidor/limpeza.test.ts`, `app/api/limpeza/route.ts`, `app/api/admin/retencao/route.ts`, `vercel.json` e testes das rotas
- Modify: `app/admin/page.tsx` (seção "Limpeza automática")

**Interfaces:**
- Consumes: `consultar`, `exigirAdmin`.
- Produces: `type Retencao = { maxPorVendedor: number; maxDias: number | null }` (padrão `{100, null}`; `maxPorVendedor` inteiro 1–10000, `maxDias` nulo ou inteiro 1–3650, senão `ErroValidacao`); `lerRetencao(): Promise<Retencao>`; `salvarRetencao(r: Retencao): Promise<void>`; `executarLimpeza(): Promise<{ removidos: number; quando: string }>` (apaga, por vendedor, tudo além dos N mais recentes por `atualizado_em` e, se `maxDias`, o que for mais velho que isso; grava o resultado em `configuracoes` com a chave `ultima_limpeza`); `lerUltimaLimpeza()`. `GET /api/limpeza` só responde com `Authorization: Bearer <CRON_SECRET>` (sem a variável configurada ou sem o cabeçalho → 401); `GET/PUT /api/admin/retencao` (admin) devolve/grava `{retencao, ultimaLimpeza}`. `vercel.json`: cron `GET /api/limpeza` uma vez por dia (`0 6 * * *`).

- [ ] **Step 1: Testes** (PGlite). Com `maxPorVendedor: 2`, `ana` com 4 croquis fica com os 2 mais recentes e `bia` (1 croqui) não perde nenhum; `maxDias: 30` apaga croqui de 31 dias e mantém o de 29; contas nunca são apagadas; retenção inválida (0, 10001, `maxDias: 0`) → `ErroValidacao`; sem configuração salva vale o padrão 100; rota de cron sem cabeçalho ou com segredo errado → 401 e nada apagado; admin salva retenção e a próxima limpeza a usa; UI do admin salva os valores e mostra a última limpeza.
- [ ] **Step 2:** rodar → FAIL. **Step 3:** implementar com `DELETE ... WHERE id IN (SELECT id FROM (SELECT id, row_number() OVER (PARTITION BY usuario_id ORDER BY atualizado_em DESC, id DESC) rn FROM croquis) t WHERE rn > $1) RETURNING id` e `DELETE ... WHERE atualizado_em < now() - make_interval(days => $1) RETURNING id`. **Step 4:** rodar → PASS.
- [ ] **Step 5: Commit** `Limpeza automática configurável pelo admin, com cron diário`.

### Task 10: Preparação do banco, documentação e verificação final

**Files:**
- Create: `lib/servidor/preparar.ts`, `lib/servidor/preparar.test.ts`, `scripts/preparar-banco.ts`
- Modify: `README.md`, `CLAUDE.md` (seção de arquitetura e comandos), `docs/superpowers/specs/2026-11-20-login-persistencia-design.md` (trocar "bcrypt" por "scrypt do `node:crypto`")

**Interfaces:**
- Produces: `prepararBanco(admin?: { usuario: string; senha: string; nome?: string }): Promise<{ admin: "criado" | "ja-existia" | "nao-informado" }>` (aplica `COMANDOS_ESQUEMA`; cria a conta admin só se ainda não existir **nenhum** admin; idempotente; nunca altera senha de conta existente). `scripts/preparar-banco.ts` lê `ADMIN_USUARIO`/`ADMIN_SENHA` do ambiente e chama `prepararBanco`; roda com `npx tsx --env-file=.env.local scripts/preparar-banco.ts`.

- [ ] **Step 1: Testes.** Primeira execução cria o esquema e o admin; segunda execução devolve `"ja-existia"` e não troca a senha; sem credenciais só cria o esquema (`"nao-informado"`); a conta criada é `admin: true` e consegue logar.
- [ ] **Step 2:** rodar → FAIL. **Step 3:** implementar e documentar no README: criar o banco pela Vercel (Marketplace → Neon, plano Free, Auth desligado), variáveis de ambiente (`SESSAO_SEGREDO` gerado com `openssl rand -base64 48`, `CRON_SECRET`), rodar o script uma vez, regra de limpeza e o limite do plano gratuito (1 GB). Atualizar `CLAUDE.md` com `lib/servidor/*`, `proxy.ts`, o salvamento automático e o comando do script.
- [ ] **Step 4: Verificação final.** `npm test` → tudo passa; `npx tsc --noEmit` → só o erro antigo de `LayoutProps` em `app/layout.tsx`; `npm run build` → sucesso. Com `.env.local` apontando para um banco de desenvolvimento (branch da Neon, nunca a produção): `npm run dev`, rodar o script, entrar como admin, criar uma conta de vendedor, entrar como ela, percorrer o assistente até o Resultado conferindo "Salvo", abrir "Meus croquis", conferir que o admin enxerga o croqui e que outro vendedor não.
- [ ] **Step 5: Commit** `Preparação do banco, documentação e verificação do login`.
