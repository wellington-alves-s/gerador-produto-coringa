# Login de vendedores e croquis salvos

## Intenção
Cerca de 130 vendedores da Madel usarão o app (começando com poucos). Cada um entra com usuário e senha, salva os croquis que gera e os reabre depois, organizados pelo nome do cliente. Só o admin cria contas e troca senhas. Hoje não há login nem banco; o estado persistido é um único rascunho em `localStorage`.

## Objetivos / não-objetivos / anti-objetivos
- Objetivo: login por usuário e senha; croquis salvos por vendedor; vendedor vê só os seus; admin vê todos; painel de admin (criar, trocar senha, desativar); limpeza automática configurável.
- Objetivo: a rota `/api/gerar-imagem` exige login (protege a cota paga).
- Não-objetivo: autocadastro, recuperação de senha por e-mail, login social, papéis além de vendedor/admin, compartilhar croqui entre vendedores, fixar croquis contra a limpeza, histórico de versões.
- Anti-objetivo: um vendedor ver ou alterar croqui de outro; perder croqui por falha de salvamento sem aviso; senha guardada em texto.

## Restrições
- Hospedagem na Vercel (sem disco gravável): banco externo.
- Next 16 com App Router; nomes em português; medidas formatadas por `lib/formatacao.ts` (nada muda aqui).
- Plano gratuito do Neon: 1 GB por projeto e 100 CU-hours por mês (conferir os limites do banco criado pelo Marketplace da Vercel).

## Abordagens consideradas
1. **Postgres (Neon) + sessão própria** (escolhida): bcrypt + cookie assinado (`jose`) + driver `@neondatabase/serverless`, SQL direto. Poucas dependências, painel de admin e regras de dono ficam em código nosso.
2. Auth.js com ORM: o provedor de usuário/senha é a parte menos suportada e traz muito código para 130 usuários. Descartada.
3. Supabase: exige e-mail para login, segundo serviço e regras por linha. Descartada.
Alternativa de hospedagem do banco: VM Oracle Always Free com Postgres próprio. Descartada por ora (VM ociosa pode ser recolhida, banco exposto à internet, backup e manutenção por conta do admin). O código é o mesmo Postgres, então a migração futura só troca `DATABASE_URL`/driver.

## Dados
- `usuarios`: id, usuario (único, minúsculo), senha_hash, nome, admin (bool), ativo (bool), criado_em.
- `croquis`: id, usuario_id, cliente (texto, de `estado.pedido.cliente`), numero_pedido, tipo, estado (JSON do `EstadoPedido`), criado_em, atualizado_em. Índices por (usuario_id, atualizado_em) e por cliente.
- `configuracoes`: chave/valor (retenção da limpeza).
- `tentativas_login`: chave (usuário ou IP), contagem, janela, para limitar tentativas.
- Imagens (principal e coladas) ficam dentro do JSON do estado no início. Se o banco pesar, migram para o Vercel Blob (fora desta fase).

## Fluxos
- **Login** (`/login`): usuário e senha → confere hash e `ativo` → cookie `httpOnly`, `secure`, `sameSite=lax`, assinado, expira em 7 dias. Limite de tentativas por usuário e por IP, com mensagem genérica de erro.
- **Proteção**: `proxy.ts` redireciona para `/login` quem não tem sessão válida (exceto `/login`); rotas de API conferem a sessão no servidor (a verificação real não depende só do proxy). `verificarAcesso` de `lib/servidor/protecao.ts` passa a validar a sessão.
- **Salvar**: botão "Salvar" no Resultado grava o `EstadoPedido` completo. Primeiro salvamento cria o registro e guarda o id no estado; os seguintes atualizam o mesmo registro. Falha de rede ou do servidor mostra erro claro e mantém o rascunho local.
- **Salvamento automático**: cada clique em "Próximo" (do Pedido em diante, quando o nome do cliente já existe) grava o estado no croqui. O primeiro cria o registro e guarda o id no estado; os seguintes atualizam. Falha de rede não bloqueia a navegação: mostra um aviso discreto e o rascunho local continua valendo. O botão "Salvar" do Resultado faz o mesmo salvamento, de forma explícita. Escolher só o tipo (primeira etapa) não cria registro, para não gerar rascunhos vazios.
- **Meus croquis**- **Meus croquis** (`/croquis`): lista paginada e busca por cliente, mais recentes primeiro. Abrir carrega o estado no assistente, na Revisão, editável. Excluir pede confirmação.
- **Admin** (`/admin`, só `admin`): lista vendedores; cria conta (usuário, nome, senha inicial), troca senha, ativa/desativa. Também vê os croquis de todos, com filtro por vendedor (somente leitura da lista; abrir um croquis de outro carrega-o para consulta).
- **Primeira conta admin**: criada por variáveis de ambiente (`ADMIN_USUARIO`, `ADMIN_SENHA`) na primeira execução de um script de preparação do banco (`scripts/preparar-banco.mjs`), idempotente.

## Limpeza automática
- Configuração no painel do admin, guardada em `configuracoes` (muda sem deploy): **manter os N croquis mais recentes por vendedor** (padrão 100) e, opcionalmente, **apagar os mais velhos que X dias** (desligado por padrão). Vale para todos os vendedores.
- Executa por Vercel Cron diariamente em `/api/limpeza`, protegida por `CRON_SECRET`; apaga em lotes e registra a quantidade removida (visível no painel).
- Apaga croquis, nunca contas. Sem lixeira: o que a limpeza remove não volta.
- Aviso na tela "Meus croquis" informando a regra vigente.

## Segurança
- Senha em bcrypt; nunca em log nem em resposta de API.
- Todo acesso a croqui filtra por `usuario_id` da sessão (admin é a exceção explícita); id de outro vendedor devolve 404.
- Chaves em variáveis de ambiente da Vercel (`DATABASE_URL`, `SESSAO_SEGREDO`, `CRON_SECRET`, `ADMIN_*`); nada no repositório.
- Entrada validada no servidor (tamanho máximo do JSON do croqui, usuário em formato permitido).

## Decisões minhas (corrigíveis)
Cookie de sessão de 7 dias; limite de 100 croquis por vendedor como padrão; senha inicial definida pelo admin e trocada só pelo admin; croqui aberto por admin carrega no assistente para consulta, e salvar nele grava como cópia do admin (não sobrescreve o do vendedor); busca por cliente por texto parcial, sem acento.

## Fica para quem constrói
Estrutura de pastas e nomes das rotas de API; biblioteca de bcrypt compatível com o ambiente da Vercel; formato exato das mensagens; testes (autenticação, isolamento por dono, limpeza, validação de entrada) e o roteiro de verificação em produção.
