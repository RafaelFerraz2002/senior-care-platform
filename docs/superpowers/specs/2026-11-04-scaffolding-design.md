# Desenho: scaffolding do monorepo (#17)

- **Ticket:** [#17](https://github.com/RafaelFerraz2002/senior-care-platform/issues/17)
- **Data:** 2026-11-04
- **Decisões de base:** ADR-001 (stack), ADR-002 (multi-organização), ADR-003 (autenticação), ADR-004 (processo), ADR-005 (testes), ADR-006 (RGPD). Este desenho **aplica** essas decisões; não as muda.

## Porquê

É o primeiro código do projeto. Fixa a estrutura, as ferramentas e as convenções que todos os módulos vão seguir. Quem faz o merge não quer ler código: confia nos testes, no CI e nas descrições dos PRs. Por isso, o esqueleto tem de nascer com testes legíveis em português e com regras que se verificam sozinhas.

## Objetivo

Um **esqueleto que funciona de ponta a ponta, sem nenhuma funcionalidade**. No fim:
- um comando arranca tudo (Postgres, MinIO e Mailpit no Docker, a API e as duas apps);
- a API responde a `GET /saude` e confirma que chega à base de dados;
- a Gestão abre uma página que chama `GET /saude` através do cliente gerado;
- o Registo Diário abre, instala-se como PWA e chama `GET /saude`;
- existe um teste de cada nível (unitário, integração com Postgres real, ponta a ponta), com nomes em português, e `pnpm test:tudo` corre os três;
- o pre-commit formata e faz lint dos ficheiros alterados.

**Não objetivos:**
- funcionalidades;
- modelo de dados (#16);
- login (ticket próprio);
- CI (#18);
- deploy (#19);
- ruleset (#24).

**Anti-objetivos:**
- nomes misturados sem regra;
- testes que passam sem testar nada;
- uma ferramenta de qualidade instalada mas que não corre (por exemplo, hooks que não se instalam).

## Divisão em dois PRs

1. **#17, este desenho:** estrutura, ferramentas, apps vazias e documentação.
2. **Ticket novo, "Base de dados multi-organização":**
   - papéis dono e app no `docker compose`;
   - o `comOrganizacao`;
   - a primeira migração (tabela `organizacoes`);
   - o teste de catálogo e o teste de isolamento A/B do ADR-002, com o gerador de dados fictícios das organizações A e B.

   É o código mais sensível e tem uma revisão só para ele. Cria-se quando este desenho for aprovado, e o #16 passa a depender dele.

   O ADR-002 aponta estas peças para o #17. A decisão não muda, só o ticket; como um ADR aceite não se reescreve, a separação fica registada no ticket novo e neste desenho.
   A infraestrutura das bases clonadas por ficheiro de teste (ADR-005) também vai para esse ticket, porque precisa de migrações.

## Convenção de nomes (decidida)

**O negócio em português, a técnica em inglês.** Escreve-se no `CLAUDE.md` com estes exemplos.

| O quê | Língua | Exemplo |
|---|---|---|
| Tabelas, colunas, entidades e módulos do domínio | Português, sem acentos; `snake_case` na base, `camelCase` no TypeScript | `utentes`, `registos_diarios`, `organizacao_id` / `organizacaoId`, `dataNascimento` |
| Rotas da API e das apps | Português, `kebab-case` | `GET /utentes/:id`, `/registo-diario` |
| Nomes dos testes e mensagens ao utilizador | Português, frases | `it('recusa ver utentes de outra organização')` |
| Verbos, padrões e sufixos técnicos | Inglês | `UtentesService.findById()`, `createRegisto()`, `useUtentes()`, `*.controller.ts` |
| Pastas técnicas e ficheiros de configuração | Inglês | `apps/api/src/common/`, `vitest.config.ts` |

- Os exemplos dos ADRs com `organization_id` passam a `organizacao_id`. Os ADRs dizem que os nomes são ilustrativos.
- Na dúvida entre "negócio" e "técnica": se a palavra aparece nos requisitos do Notion ou na interface, é negócio e fica em português.
- *Rejeitado:* tudo em inglês (traduções discutíveis de "utente" e "resposta social"); tudo em português (choca com as bibliotecas e não tem uma fronteira clara).

## Língua dos documentos (decidida)

- Tudo em português de Portugal, **incluindo o README**.
- O README serve também de montra para o portfólio: o que é o projeto, a stack, as decisões de arquitetura (com link para os ADRs), como correr e o estado atual.

## Versões (verificadas a 2026-11-04)

| Peça | Versão | Nota |
|---|---|---|
| Node | **26 LTS**, fixado no `.nvmrc` e em `engines` | LTS ativo desde 2026-10-28, com suporte até 2029-04. |
| pnpm / Turborepo | 12.x / 2.x | `packageManager` no `package.json` raiz. |
| TypeScript | **~6.0.3** | **Não usar o TS 7**: o typescript-eslint e o @nestjs/swagger ainda não o suportam. |
| NestJS | 12.x | **ESM.** Linter trocado do oxlint para ESLint (ADR-001). |
| Drizzle / drizzle-kit | 0.45.x / 0.31.x | Não usar a 1.0-rc. |
| Zod | 4.x | Validação no NestJS pelo `StandardSchemaValidationPipe`. **Não usar o nestjs-zod**, que não suporta o Nest 12. |
| React / Vite | 19.x / 8.x | |
| TanStack Router / Query | 1.x / 5.x | |
| Tailwind / shadcn | 4.x (`@tailwindcss/vite`) / CLI 4.x em modo monorepo | |
| vite-plugin-pwa | 2.x | |
| Vitest (+ coverage-v8) | 5.x | API com `unplugin-swc`, por causa dos decorators. |
| Testcontainers | 12.x (`@testcontainers/postgresql`) | |
| Playwright | 1.64.x | |
| ESLint / typescript-eslint / Prettier | 10.x / 8.x / 3.x | Flat config. |
| eslint-plugin-boundaries | 7.x | Regra `boundaries/dependencies`. |
| Lefthook | 2.x | Exige `allowBuilds` no `pnpm-workspace.yaml` (ver Riscos). |
| PostgreSQL | **17** no Docker e nos Testcontainers | O Scaleway (produção, ADR-006) documenta até à 17. |

**Cliente gerado a partir do OpenAPI: hey-api (`@hey-api/openapi-ts`)**, com o plugin TanStack Query. Gera `queryOptions` e `mutationOptions`, o que encaixa no Query v5 e nos loaders do Router.
- *Rejeitado: orval.* Mais pesado; os mocks e o Zod gerados não fazem falta, porque o Zod já vem de `packages/shared`.
- *Rejeitado: openapi-typescript + openapi-fetch.* Gera só tipos, e o adaptador do React Query está parado.
- **Risco:** a hey-api ainda está abaixo da 1.0. Fixar a versão exata.

## Estrutura

A do ADR-001, mais o pacote de testes ponta a ponta e o gerador de dados (ADR-005):

```
apps/api            NestJS (ESM)
apps/gestao         React SPA (Vite, TanStack Router e Query)
apps/registo        React PWA (Vite, vite-plugin-pwa)
packages/shared     schemas Zod e tipos (inclui o schema de /saude)
packages/api-client gerado pela hey-api; nunca se edita à mão
packages/ui         Tailwind + shadcn; um componente inicial (Button)
packages/config     ESLint, TypeScript e Prettier partilhados
packages/dados-ficticios  gerador com semente fixa (esqueleto; as organizações A/B entram no ticket da base de dados)
e2e                 Playwright
docs/
docker-compose.yml  Postgres 17, MinIO, Mailpit
```

## O que cada peça tem neste PR

**Raiz**
- `pnpm-workspace.yaml` com `allowBuilds` (lefthook, @swc/core, esbuild).
- `turbo.json` com as tarefas `dev`, `build`, `lint`, `typecheck`, `test`, `test:integracao` e `test:e2e`.
- `.nvmrc`, `.editorconfig` e `.gitignore` (com `.env`, ADR-006).
- `.env.example` sem valores secretos.
- `lefthook.yml`: Prettier e ESLint só nos ficheiros alterados, em paralelo, com `stage_fixed`.

**`packages/config`**
- TypeScript `strict`.
- ESLint flat config com typescript-eslint, os plugins de React hooks e de TanStack Query, e o eslint-plugin-boundaries. As regras do boundaries ficam já ativas:
  - as apps só importam `packages/*`, nunca `apps/api`;
  - um módulo da API não importa o interior de outro;
  - a pool da base de dados não se importa fora do módulo de base de dados, que só nasce no ticket da base de dados.
- Limite de complexidade por função: **10**.
- Prettier com o plugin de Tailwind.

**`apps/api`**
- NestJS em ESM, com `GET /saude`: responde `{ estado: 'ok', baseDeDados: 'ok' }` depois de um `SELECT 1`.
- **Módulo `base-de-dados` mínimo:** uma pool `pg`, sem Drizzle, com um único método público `verificarLigacao()`, que o `/saude` usa. O boundaries já impede importar a pool fora deste módulo. O Drizzle, o `comOrganizacao` e as migrações entram no ticket da base de dados.
- **A API liga-se com um papel `app` sem privilégios** (LOGIN, não superutilizador, sem `BYPASSRLS`), criado pelo `docker compose` num script de arranque. Nunca com o `postgres` (ADR-002). O papel dono entra no ticket da base de dados.
- **Sentry (ADR-006), instalado já mas desligado sem `SENTRY_DSN`**, na API e nas duas apps, com as regras do ADR-006: sem IP, cookies, headers, corpos nem variáveis locais, sem utilizador e com `beforeSend`. Um teste unitário verifica que o `beforeSend` remove esses campos.
- **Relógio injetável** (ADR-005): um provider `Relogio` com `agora()`, e uma versão de teste que se pode avançar.
- **Logs** (pino) só com IDs. Os corpos dos pedidos e os headers de autenticação não entram (ADR-006).
- OpenAPI gerado a partir dos mesmos schemas Zod de `packages/shared`, escrito em `apps/api/openapi.json`, de onde a hey-api gera o `api-client`.
  - **O `openapi.json` e o `packages/api-client` ficam versionados.** As apps compilam sem arrancar a API, e uma mudança no contrato da API aparece no diff do PR.
  - Para não ficarem desatualizados, há um teste que gera o OpenAPI em memória e o compara com o ficheiro versionado, e falha se forem diferentes. O CI (#18) corre-o.
  - A geração arranca a aplicação NestJS sem a pôr à escuta e sem ligar à base de dados.
- Testes:
  - um unitário (o relógio);
  - um de integração com Testcontainers e Postgres 17: "`/saude` responde ok com a base de dados ligada".

**`apps/gestao` e `apps/registo`**
- Vite, React, TanStack Router e Query, Tailwind e `packages/ui`.
- Uma página "Senior Care Platform: Gestão" (ou "Registo Diário") que mostra o estado de `/saude`.
- O Registo Diário com vite-plugin-pwa: manifesto, ícone provisório e service worker.
- Um teste de componente em cada app, com Testing Library.

**`e2e`**
- Playwright com Chromium e WebKit, este com emulação de iPad no Registo Diário.
- Um teste por app: "a página abre e mostra a API ligada". Inclui a verificação de acessibilidade (axe).
- **Neste PR, os testes correm contra os servidores de desenvolvimento** (Vite e API em Node), com os serviços do `docker compose`. O ADR-005 pede um ambiente "como em produção (contentores)", mas o Dockerfile da API e as apps compiladas servidas pertencem ao #19. Quando o #19 estiver feito, o `e2e` passa a correr nesse ambiente.

**Documentação**
- `README.md` (português): o que é, a stack, as decisões (link para os ADRs), como correr, o estado.
- `CONTRIBUTING.md`: branches `tipo/#nr-descricao`, Conventional Commits no título do PR, `Closes #nr`, squash merge, definição de pronto (ADR-004) e o que cada PR tem de trazer em testes (ADR-005).
- `CLAUDE.md`:
  - a convenção de nomes;
  - os comandos de build, teste e lint;
  - retirar "Até lá, não escrever código";
  - o README em português.
- ADR-005 passa a "Aceite".

## Comandos (o que fica no `CLAUDE.md`)

- `pnpm install`
- `pnpm dev`: sobe o `docker compose` e as três apps.
- `pnpm lint`, `pnpm typecheck` e `pnpm test`: unitários e componentes, rápido e sem Docker.
- `pnpm test:integracao`: precisa de Docker.
- `pnpm test:e2e`
- `pnpm test:tudo`: unitários, componentes, integração e e2e.
- `pnpm gerar:api-client`: regenera o `openapi.json` e o cliente depois de mudar a API.
- `pnpm verificar:tamanho`: mede o JavaScript de cada app e compara com `tamanho-apps.json`. Os valores de referência são os deste PR (ADR-005); o check obrigatório entra no #18.

## Deixado a quem constrói

- Portas, a versão exata (patch) de cada dependência e a estrutura interna de `apps/api/src`, desde que respeitem o boundaries.
- Como sobe o `docker compose` no `pnpm dev`.
- A biblioteca de geração de dados fictícios (por exemplo, `@faker-js/faker` com locale `pt_PT`).

## Riscos e verificações

| Risco | Como se verifica no plano |
|---|---|
| Os hooks não se instalam com o pnpm recente e os commits passam sem verificação | Passo explícito: um commit com um ficheiro mal formatado é corrigido ou bloqueado. |
| A geração do OpenAPI a partir de Zod com o NestJS 12 ainda não estar madura | **Primeira tarefa do plano:** uma prova rápida (Zod → OpenAPI → hey-api → página). Se falhar, volta-se à conversa antes de continuar. |
| Decorators do NestJS nos testes com Vite 8 | `unplugin-swc`, e desligar o Oxc se tirar a metadata. Verificado pelo teste de integração. |
| Path aliases partidos em ESM no NestJS 12 | Não usar aliases na API: imports relativos dentro da app e pacotes do workspace entre pacotes. |
| O eslint-plugin-boundaries com ESLint 10 | Um teste ao lint: um import proibido de propósito tem de falhar (ficheiro de verificação temporário, removido no fim). |
