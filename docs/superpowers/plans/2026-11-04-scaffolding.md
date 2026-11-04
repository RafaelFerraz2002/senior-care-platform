# Scaffolding do monorepo (#17): plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Um esqueleto do monorepo que funciona de ponta a ponta, sem funcionalidades: a API com `GET /saude` ligada ao Postgres, a Gestão e o Registo Diário a mostrar esse estado através do cliente gerado, e um teste de cada nível.

**Architecture:** Monorepo pnpm + Turborepo (ADR-001). `packages/shared` tem os schemas Zod, que a API (NestJS 12, ESM) usa para validar e para gerar o `openapi.json`. Desse ficheiro, a hey-api gera o `packages/api-client`, que as apps (Vite + TanStack Router/Query) consomem através de um proxy `/api`, para ficarem no mesmo domínio (ADR-003).

**Tech Stack:** Node 26, pnpm 12, Turborepo 2, TypeScript ~6.0.3, NestJS 12, pg, Zod 4, React 19, Vite 8, TanStack Router 1 / Query 5, Tailwind 4 + shadcn, vite-plugin-pwa 2, Vitest 5 + unplugin-swc, Testcontainers 12, Playwright 1.64 + @axe-core/playwright, ESLint 10 + typescript-eslint 8 + eslint-plugin-boundaries 7, Prettier 3, Lefthook 2, pino, Sentry, @faker-js/faker, Postgres 17.

**Spec:** `docs/superpowers/specs/2026-11-04-scaffolding-design.md`. Ler também o `CLAUDE.md` e os ADRs em `docs/adr/`.

## Global Constraints

- **Branch:** `chore/#17-scaffolding` (já existe). Nunca fazer push para `main`. Commits com Conventional Commits; sem linha `Claude-Session`.
- **Nomes:** o negócio em português sem acentos (tabelas, colunas, entidades, módulos, rotas, nomes de testes e mensagens); a técnica em inglês (verbos, padrões, sufixos, pastas técnicas, ficheiros de configuração, variáveis de ambiente). Na dúvida: se aparece nos requisitos ou na interface, é negócio.
- **Nomes dos testes:** frases em português (`it('responde ok com a base de dados ligada')`).
- **Versões:**
  - Node 26 LTS (`.nvmrc`, `engines`); pnpm 12 (`packageManager`);
  - **TypeScript `~6.0.3`, nunca 7**;
  - Postgres **17** no Docker e nos Testcontainers;
  - NestJS 12 em **ESM**, com o ESLint e não o oxlint; **sem nestjs-zod**;
  - Drizzle **não entra** neste ticket.
- **Sem path aliases na API:** imports relativos dentro da app e pacotes do workspace entre pacotes.
- **Fixar versões exatas** da `@hey-api/openapi-ts` (abaixo da 1.0).
- **Portas de desenvolvimento:** API 3000, Gestão 5173, Registo 5174.
- **Base de dados:** a API liga-se sempre com o papel `app` (LOGIN, `NOSUPERUSER`, `NOBYPASSRLS`), nunca com o `postgres`.
- **Dados:** só fictícios. Sem segredos versionados: `.env` no `.gitignore` e só `.env.example`, com valores locais não secretos.
- **Logs e Sentry:** só IDs; sem corpos de pedidos, headers de autenticação, IP, cookies nem utilizador (ADR-006).
- **Exceções a checks** (valores de referência, `v8 ignore`, quarentena): nunca por iniciativa própria (`CLAUDE.md`). A criação inicial do `tamanho-apps.json` faz parte da Tarefa 9 e não é uma exceção.

## Review Focus

1. **API a arrancar sem a base de dados disponível:** o `/saude` responde HTTP 503 com `{ estado: 'erro', baseDeDados: 'erro' }` e a API não vai abaixo (teste na Tarefa 3).
2. **Variável de ambiente em falta:** a API recusa-se a arrancar com a mensagem `Variável de ambiente em falta: DATABASE_URL`, e não com um erro obscuro mais tarde (teste na Tarefa 3).
3. **Máquina sem Docker a correr:** `pnpm test` passa na mesma (unitários e componentes não precisam de Docker); só `test:integracao` e `test:e2e` precisam (verificação na Tarefa 9).
4. **Registo Diário aberto sem rede, depois da primeira visita:** a app abre a partir do service worker e mostra "API sem ligação" em vez de uma página de erro do browser (teste na Tarefa 7).
5. **CORS:** a API não responde com `Access-Control-Allow-Origin` a uma origem estranha. As apps chegam-lhe pelo proxy `/api` e não por CORS (teste na Tarefa 3).

---

### Task 1: Raiz do monorepo, configuração partilhada e pre-commit

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.nvmrc`, `.editorconfig`, `.gitignore`, `.env.example`, `lefthook.yml`, `.prettierrc.mjs`, `eslint.config.mjs`
- Create: `packages/config/package.json`, `packages/config/tsconfig.base.json`, `packages/config/eslint/base.mjs`, `packages/config/eslint/react.mjs`, `packages/config/prettier.mjs`

**Interfaces:**
- Produces:
  - `@scp/config` com `tsconfig.base.json` (`strict: true`, `module`/`moduleResolution: NodeNext`, `target: ES2023`, `verbatimModuleSyntax: true`);
  - `eslint/base.mjs`, que exporta um array flat config com typescript-eslint, `complexity: ['error', 10]` e o eslint-plugin-boundaries **com os elementos já declarados**: `app-api` (`apps/api`), `app-web` (`apps/gestao`, `apps/registo`), `pacote` (`packages/*`), `api-modulo` (`apps/api/src/modulos/*`), `api-base-de-dados` (`apps/api/src/base-de-dados`);
  - regras `boundaries/dependencies`: `app-web` só depende de `pacote`; `api-modulo` só importa o `index.ts` de outro `api-modulo`; só `api-base-de-dados` importa `pg`;
  - `eslint/react.mjs` acrescenta os plugins react-hooks e @tanstack/query;
  - scripts raiz `dev`, `build`, `lint`, `typecheck`, `test`, `test:integracao`, `test:e2e`, `test:tudo`, `gerar:api-client`, `verificar:tamanho` (os dois últimos são preenchidos nas Tarefas 2 e 9).
- Prefixo dos pacotes do workspace: `@scp/` (`@scp/shared`, `@scp/api-client`, `@scp/ui`, `@scp/config`, `@scp/dados-ficticios`, `@scp/api`, `@scp/gestao`, `@scp/registo`, `@scp/e2e`).

- [ ] **Step 1:** Criar os ficheiros da raiz.
  - `pnpm-workspace.yaml` com `packages: [apps/*, packages/*, e2e]` e `allowBuilds` para `lefthook`, `@swc/core` e `esbuild`.
  - `turbo.json` com as tarefas do spec; `dev` com `persistent: true` e `cache: false`; `test:integracao` e `test:e2e` com `cache: false`.
  - `.gitignore` com `node_modules`, `dist`, `.env`, `.turbo`, `coverage`, `playwright-report`, `test-results`.
- [ ] **Step 2:** Criar o `packages/config` com as Interfaces acima e o `.prettierrc.mjs` (plugin de Tailwind).
- [ ] **Step 3:** `lefthook.yml` com `pre-commit` em paralelo: `prettier --write {staged_files}` e `eslint --fix {staged_files}`, com `glob` para `*.{ts,tsx,mjs,json,md,yml}` e `stage_fixed: true`.
- [ ] **Step 4:** Correr `pnpm install`. Esperado: sem `ERR_PNPM_IGNORED_BUILDS`; `pnpm exec lefthook install` cria `.git/hooks/pre-commit`.
- [ ] **Step 5:** Correr `pnpm lint`. Esperado: termina com código 0.
- [ ] **Step 6:** Commit `chore: raiz do monorepo, configuração partilhada e pre-commit`.

### Task 2: Contrato `/saude`, API NestJS (ESM) e cliente gerado (prova da cadeia Zod → OpenAPI → hey-api)

**Gate:** se o NestJS 12 não conseguir gerar o OpenAPI a partir dos schemas Zod (via `@nestjs/swagger` e o JSON Schema do Zod 4, `z.toJSONSchema`), **parar e reportar** antes da Tarefa 3. Não trocar de biblioteca sem voltar à conversa.

**Files:**
- Create: `packages/shared/package.json`, `packages/shared/src/index.ts`, `packages/shared/src/saude.ts`, `packages/shared/src/saude.test.ts`
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/vitest.config.ts`, `apps/api/src/main.ts`, `apps/api/src/app.module.ts`, `apps/api/src/criar-app.ts`, `apps/api/src/modulos/saude/index.ts`, `apps/api/src/modulos/saude/saude.controller.ts`, `apps/api/src/openapi/gerar-openapi.ts`, `apps/api/openapi.json`
- Create: `packages/api-client/package.json`, `packages/api-client/openapi-ts.config.ts`, `packages/api-client/src/` (gerado)
- Test: `apps/api/src/openapi/openapi.test.ts`

**Interfaces:**
- Produces (`@scp/shared`):
  - `saudeRespostaSchema = z.object({ estado: z.enum(['ok', 'erro']), baseDeDados: z.enum(['ok', 'erro']) })`;
  - `type SaudeResposta = z.infer<typeof saudeRespostaSchema>`.
- Produces (`@scp/api`):
  - `createApp(): Promise<INestApplication>` em `criar-app.ts`, que monta a app sem a pôr à escuta;
  - `GET /saude`, com `operationId: 'getSaude'` e resposta `200 SaudeResposta`;
  - `generateOpenApiDocument(app: INestApplication): OpenAPIObject`.
- Produces (`@scp/api-client`): `getSaude()` e `getSaudeOptions()` (plugin TanStack Query), com `baseUrl` configurável pela app.

- [ ] **Step 1:** Escrever o teste em `packages/shared/src/saude.test.ts`: `it('aceita { estado: "ok", baseDeDados: "ok" } e rejeita estados desconhecidos')`. `saudeRespostaSchema.parse({ estado: 'ok', baseDeDados: 'ok' })` passa e `saudeRespostaSchema.safeParse({ estado: 'talvez', baseDeDados: 'ok' }).success === false`.
- [ ] **Step 2:** Correr `pnpm --filter @scp/shared test`. Esperado: FAIL (o módulo não existe).
- [ ] **Step 3:** Implementar `saudeRespostaSchema` e exportá-lo em `index.ts`.
- [ ] **Step 4:** Correr o teste. Esperado: PASS.
- [ ] **Step 5:** Criar a API NestJS 12 em ESM.
  - `vitest.config.ts` com `unplugin-swc`. Se a metadata dos decorators se perder, pôr `oxc: false`.
  - `SaudeController` com `GET /saude`, que por agora devolve sempre `{ estado: 'ok', baseDeDados: 'ok' }`. A base de dados entra na Tarefa 3.
  - A resposta é validada contra o `saudeRespostaSchema`.
- [ ] **Step 6:** Escrever o teste em `apps/api/src/openapi/openapi.test.ts`:
  - `it('o openapi.json versionado está igual ao gerado a partir do código')`: gera com `generateOpenApiDocument(await createApp())` e compara com `JSON.parse(readFile('apps/api/openapi.json'))`;
  - `it('documenta GET /saude com o schema SaudeResposta')`: verifica `paths['/saude'].get.operationId === 'getSaude'` e que as propriedades `estado` e `baseDeDados` existem no schema da resposta.
- [ ] **Step 7:** Correr `pnpm --filter @scp/api test`. Esperado: FAIL (o `openapi.json` não existe).
- [ ] **Step 8:** Implementar `generateOpenApiDocument` e o script `gerar:api-client`:
  - escreve o `apps/api/openapi.json` (formatado, com chaves em ordem estável);
  - a seguir corre a hey-api para o `packages/api-client/src`;
  - é ligado ao script raiz `pnpm gerar:api-client`.
- [ ] **Step 9:** Correr `pnpm gerar:api-client` e depois `pnpm --filter @scp/api test`. Esperado: PASS. O `packages/api-client/src` tem `getSaude` e `getSaudeOptions`.
- [ ] **Step 10:** Correr `pnpm typecheck && pnpm lint`. Esperado: 0 erros.
- [ ] **Step 11:** Commit `feat(api): contrato /saude, OpenAPI a partir de Zod e cliente gerado`.

### Task 3: Docker, papel `app` e ligação à base de dados do `/saude`

**Files:**
- Create: `docker-compose.yml`, `docker/postgres/init/01-papel-app.sh`
- Create: `apps/api/src/config.ts`, `apps/api/src/config.test.ts`
- Create: `apps/api/src/base-de-dados/index.ts`, `apps/api/src/base-de-dados/base-de-dados.module.ts`, `apps/api/src/base-de-dados/base-de-dados.service.ts`
- Modify: `apps/api/src/modulos/saude/saude.controller.ts`, `apps/api/src/app.module.ts`, `apps/api/src/main.ts`, `.env.example`
- Test: `apps/api/test/saude.integracao.test.ts`, `apps/api/test/postgres-de-teste.ts`, `apps/api/vitest.integracao.config.ts`

**Interfaces:**
- Consumes: `createApp()`, `SaudeResposta` (Tarefa 2).
- Produces:
  - `loadConfig(env: NodeJS.ProcessEnv): Config`, com `Config = { databaseUrl: string; apiPort: number; sentryDsn?: string; logLevel: string }`. As variáveis são `DATABASE_URL`, `API_PORT` (por omissão 3000), `SENTRY_DSN` e `LOG_LEVEL`. Lança `Error('Variável de ambiente em falta: DATABASE_URL')`;
  - `BaseDeDadosService.verificarLigacao(): Promise<boolean>`, que faz um `SELECT 1` com timeout de 2 s e devolve `false` em vez de lançar erro;
  - `startTestPostgres(): Promise<{ url: string; stop(): Promise<void> }>`, que arranca o Postgres 17 com o mesmo `docker/postgres/init` copiado para `/docker-entrypoint-initdb.d` e devolve o URL **com o papel `app`**.

- [ ] **Step 1:** Criar o `docker-compose.yml`:
  - `postgres:17`, com o init montado;
  - `minio/minio`;
  - `axllent/mailpit`;
  - credenciais locais só a partir do `.env`.

  O `01-papel-app.sh` cria `app LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD '$APP_DB_PASSWORD'` e dá `CONNECT` na base.
- [ ] **Step 2:** Escrever os testes em `config.test.ts`:
  - `it('recusa arrancar sem DATABASE_URL')`, com a mensagem exata acima;
  - `it('usa a porta 3000 por omissão')`.
- [ ] **Step 3:** Correr. Esperado: FAIL. Implementar `loadConfig`. Correr outra vez. Esperado: PASS.
- [ ] **Step 4:** Escrever os testes em `apps/api/test/saude.integracao.test.ts`, com `createApp()` ligada ao `startTestPostgres()`:
  - `it('responde ok com a base de dados ligada')`: HTTP 200 e `{ estado: 'ok', baseDeDados: 'ok' }`;
  - `it('liga-se com o papel app, que não é superutilizador')`: `SELECT current_user, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user` devolve `app`, `false`, `false`;
  - `it('responde 503 sem derrubar a API quando a base de dados está em baixo')`: depois de `stop()`, HTTP 503 e `{ estado: 'erro', baseDeDados: 'erro' }`;
  - `it('não abre CORS a origens estranhas')`: um pedido com `Origin: https://exemplo.invalid` não traz `access-control-allow-origin`.
- [ ] **Step 5:** Correr `pnpm --filter @scp/api test:integracao`. Esperado: FAIL.
- [ ] **Step 6:** Implementar:
  - o módulo `base-de-dados`, com a pool `pg` interna e só o `BaseDeDadosService` exportado no `index.ts`;
  - o `SaudeController`, que usa `verificarLigacao()`;
  - o `main.ts`, que usa `loadConfig(process.env)`;
  - a API sem `enableCors`.
- [ ] **Step 7:** Correr `pnpm --filter @scp/api test:integracao`. Esperado: 4 PASS.
- [ ] **Step 8:** Correr `docker compose up -d` e `curl localhost:3000/saude` com a API a correr. Esperado: `{"estado":"ok","baseDeDados":"ok"}`.
- [ ] **Step 9:** Commit `feat(api): ligação à base de dados com o papel app e /saude com estado real`.

### Task 4: Relógio injetável, logs sem dados pessoais, Sentry desligado e gerador de dados fictícios

**Files:**
- Create: `apps/api/src/common/relogio.ts`, `apps/api/src/common/relogio.test.ts`
- Create: `apps/api/src/common/logger.ts`, `apps/api/src/common/logger.test.ts`
- Create: `packages/shared/src/sentry.ts`, `packages/shared/src/sentry.test.ts`, `apps/api/src/common/sentry.ts`, `apps/api/src/common/sentry.test.ts`
- Create: `packages/dados-ficticios/package.json`, `packages/dados-ficticios/src/index.ts`, `packages/dados-ficticios/src/index.test.ts`

**Interfaces:**
- Produces:
  - `abstract class Relogio { abstract agora(): Date }`;
  - `class RelogioSistema extends Relogio`;
  - `class RelogioDeTeste extends Relogio { constructor(inicio: Date); avancar(ms: number): void; definir(data: Date): void }`;
  - o `Relogio` é um provider global, e `RelogioSistema` é o valor por omissão.
- Produces: `createLogger(level: string): Logger` (pino), com `redact` para `req.headers.authorization`, `req.headers.cookie`, `req.body` e `res.body`, e sem `req.remoteAddress`.
- Produces (`@scp/shared`):
  - `scrubSentryEvent<T extends SentryEventLike>(event: T): T`, que remove `user`, `request.cookies`, `request.headers`, `request.data`, `request.env`, `contexts.geo` e as variáveis locais dos frames;
  - as opções de init sem PII.
- Produces (`@scp/api`): `initSentry(config: Config): boolean`, que só inicializa se houver `sentryDsn` e devolve se inicializou.
- Produces (`@scp/dados-ficticios`): `createGerador(semente: number): { nomePessoa(): string; dataNascimento(): Date }`, com o locale `pt_PT` do `@faker-js/faker`.

- [ ] **Step 1:** Escrever os testes:
  - `relogio.test.ts`: `it('o relógio de teste avança sem esperar')`. Com início `2026-01-01T00:00:00Z`, depois de `avancar(14 * 3600_000)`, `agora()` é `2026-01-01T14:00:00Z`;
  - `logger.test.ts`: `it('não escreve o corpo do pedido nem os headers de autenticação')`. Um log de um pedido com `body: { nome: 'Maria Fictícia' }` e `authorization: 'Bearer x'` não contém `Maria Fictícia` nem `Bearer`;
  - `sentry.test.ts`: `it('remove utilizador, IP, cookies, headers, corpo e variáveis locais')`, com um evento que tem todos estes campos;
  - `apps/api/src/common/sentry.test.ts`: `it('não inicializa o Sentry sem SENTRY_DSN')`, em que `initSentry` devolve `false`;
  - `dados-ficticios`: `it('a mesma semente gera os mesmos dados')`, em que `createGerador(42).nomePessoa()` é igual entre duas instâncias.
- [ ] **Step 2:** Correr `pnpm test`. Esperado: FAIL nos novos testes.
- [ ] **Step 3:** Implementar as Interfaces e ligar o logger e o `initSentry` no `main.ts`.
- [ ] **Step 4:** Correr `pnpm test`. Esperado: PASS.
- [ ] **Step 5:** Commit `feat(api): relógio injetável, logs e Sentry sem dados pessoais, gerador fictício`.

### Task 5: `packages/ui` e a app Gestão

**Files:**
- Create: `packages/ui/package.json`, `packages/ui/components.json`, `packages/ui/src/styles.css`, `packages/ui/src/button.tsx`, `packages/ui/src/index.ts`
- Create: `apps/gestao/package.json`, `apps/gestao/vite.config.ts`, `apps/gestao/index.html`, `apps/gestao/src/main.tsx`, `apps/gestao/src/routes/__root.tsx`, `apps/gestao/src/routes/index.tsx`, `apps/gestao/src/estado-api.tsx`, `apps/gestao/src/sentry.ts`
- Test: `apps/gestao/src/estado-api.test.tsx`

**Interfaces:**
- Consumes: `getSaudeOptions()` (Tarefa 2), `scrubSentryEvent` (Tarefa 4).
- Produces:
  - `@scp/ui` exporta `Button` (shadcn, Tailwind 4) e `styles.css`;
  - `EstadoApi`, um componente que mostra "API ligada" quando `baseDeDados === 'ok'` e "API sem ligação" em erro ou sem rede;
  - o `vite.config.ts` com proxy `/api` → `http://localhost:3000` (reescreve para tirar o `/api`) e a porta 5173;
  - o cliente com `baseUrl: '/api'`.

- [ ] **Step 1:** Escrever o teste em `estado-api.test.tsx` (Testing Library, com o `fetch` simulado só na fronteira):
  - `it('mostra "API ligada" quando a API responde ok')`;
  - `it('mostra "API sem ligação" quando o pedido falha')`.
- [ ] **Step 2:** Correr `pnpm --filter @scp/gestao test`. Esperado: FAIL.
- [ ] **Step 3:** Criar o `packages/ui` com `shadcn init` em modo monorepo e o `Button`. Criar a app:
  - TanStack Router com rotas por ficheiro;
  - QueryClient;
  - título "Senior Care Platform — Gestão";
  - `<html lang="pt-PT">`;
  - Sentry do browser só se `VITE_SENTRY_DSN` estiver definido, com `beforeSend: scrubSentryEvent`.
- [ ] **Step 4:** Correr o teste. Esperado: PASS. Correr `pnpm --filter @scp/gestao build`. Esperado: `dist/` criado.
- [ ] **Step 5:** Commit `feat(gestao): app Gestão e design system inicial`.

### Task 6: App Registo Diário (PWA)

**Files:**
- Create: `apps/registo/package.json`, `apps/registo/vite.config.ts`, `apps/registo/index.html`, `apps/registo/public/icone-192.png`, `apps/registo/public/icone-512.png`, `apps/registo/src/main.tsx`, `apps/registo/src/routes/__root.tsx`, `apps/registo/src/routes/index.tsx`, `apps/registo/src/estado-api.tsx`, `apps/registo/src/sentry.ts`
- Test: `apps/registo/src/estado-api.test.tsx`

**Interfaces:**
- Consumes: o mesmo da Tarefa 5. O `EstadoApi` repete-se aqui de propósito: as apps não importam uma da outra, e a fronteira é `packages/*`. Se crescer, sobe para `packages/ui` num ticket futuro.
- Produces:
  - o `vite-plugin-pwa` com o manifesto `name: 'Registo Diário'`, `short_name: 'Registo'`, `lang: 'pt-PT'`, `display: 'standalone'`, ícones 192 e 512 (provisórios);
  - `registerType: 'autoUpdate'` e o app shell em cache;
  - a porta 5174 e o proxy `/api` como na Gestão.

- [ ] **Step 1:** Escrever os mesmos dois testes da Tarefa 5, para o `EstadoApi` do Registo.
- [ ] **Step 2:** Correr. Esperado: FAIL. Implementar. Correr. Esperado: PASS.
- [ ] **Step 3:** Correr `pnpm --filter @scp/registo build`. Esperado: `dist/manifest.webmanifest` e `dist/sw.js` criados.
- [ ] **Step 4:** Commit `feat(registo): app Registo Diário como PWA`.

### Task 7: Testes ponta a ponta (Playwright)

**Files:**
- Create: `e2e/package.json`, `e2e/playwright.config.ts`, `e2e/testes/gestao.spec.ts`, `e2e/testes/registo.spec.ts`

**Interfaces:**
- Consumes: as portas 3000, 5173 e 5174; os textos "API ligada" e "API sem ligação" (Tarefas 5 e 6).
- Produces: o projeto `chromium` (Gestão e Registo) e o projeto `webkit-ipad` (`devices['iPad (gen 7)']`, só o Registo). O `webServer` arranca a API e as duas apps (`reuseExistingServer: true`), e pressupõe o `docker compose` a correr.

- [ ] **Step 1:** Escrever os testes:
  - `gestao.spec.ts`: `it('a página abre e mostra a API ligada')`, seguido de `AxeBuilder` sem violações `serious` ou `critical`;
  - `registo.spec.ts`:
    - o mesmo teste, com axe;
    - `it('abre sem rede depois da primeira visita e mostra "API sem ligação"')`: a primeira visita espera pelo service worker ativo, depois `context.setOffline(true)`, recarrega, e o título "Registo Diário" está visível com "API sem ligação".
- [ ] **Step 2:** Correr `docker compose up -d` e `pnpm test:e2e`. Esperado: FAIL até a configuração estar completa, e depois PASS nos dois projetos.
  - Para o teste offline, o service worker tem de existir: o `webServer` do Registo usa `vite build && vite preview --port 5174`, e não o `vite dev`.
- [ ] **Step 3:** Correr `pnpm test:tudo`. Esperado: tudo PASS.
- [ ] **Step 4:** Commit `test(e2e): Playwright para as duas apps, com acessibilidade e Registo offline`.

### Task 8: `pnpm dev` de ponta a ponta

**Files:**
- Modify: `package.json` (script `dev`), `turbo.json`
- Create: `scripts/dev.mjs` (se o `docker compose up -d --wait` seguido de `turbo run dev` não couber numa linha de script)

**Interfaces:**
- Consumes: tudo o que vem das tarefas anteriores.

- [ ] **Step 1:** O `pnpm dev` sobe o `docker compose` (`--wait`) e depois corre `turbo run dev` (API em watch, Gestão e Registo em Vite).
- [ ] **Step 2:** Verificar à mão: `pnpm dev`; abrir `http://localhost:5173` e `http://localhost:5174`. Esperado: as duas mostram "API ligada". Parar com Ctrl+C.
- [ ] **Step 3:** Commit `chore: pnpm dev arranca serviços, API e apps`.

### Task 9: Guardas que se verificam sozinhas

**Files:**
- Create: `scripts/verificar-tamanho.mjs`, `tamanho-apps.json`
- Modify: `package.json` (script `verificar:tamanho`)

**Interfaces:**
- Produces: `node scripts/verificar-tamanho.mjs [--atualizar]`.
  - Soma o gzip de `apps/{gestao,registo}/dist/assets/*.js` e compara com `tamanho-apps.json` (`{ "gestao": <bytes>, "registo": <bytes> }`).
  - Sai com código 1 se alguma app passar mais de 10% do valor de referência.
  - `--atualizar` escreve os valores atuais.

- [ ] **Step 1:** Implementar o script. Correr `pnpm build && node scripts/verificar-tamanho.mjs --atualizar` **uma vez**: é o valor de referência inicial que o spec pede. Correr `pnpm verificar:tamanho`. Esperado: código 0.
- [ ] **Step 2:** **Boundaries:** criar temporariamente `apps/gestao/src/proibido.ts` com `import '../../api/src/main'`. Correr `pnpm lint`. Esperado: erro `boundaries/dependencies`. Apagar o ficheiro.
- [ ] **Step 3:** **Complexidade:** criar temporariamente uma função com 11 ramos `if` num ficheiro de `packages/shared`. Correr `pnpm lint`. Esperado: erro `complexity`. Apagar o ficheiro.
- [ ] **Step 4:** **Pre-commit:** criar um ficheiro `.ts` mal formatado e com uma variável não usada, `git add` e `git commit`. Esperado: o commit é bloqueado pelo ESLint. Repor o estado sem fazer commit.
- [ ] **Step 5:** **Sem Docker:** parar o Docker (ou `DOCKER_HOST=unix:///nao-existe`) e correr `pnpm test`. Esperado: PASS. `pnpm test:integracao` falha com uma mensagem a dizer que o Docker é preciso.
- [ ] **Step 6:** Commit `chore: verificação do tamanho das apps com os valores de referência iniciais`.

### Task 10: Documentação e `CLAUDE.md`

**Files:**
- Create: `README.md`, `CONTRIBUTING.md`
- Modify: `CLAUDE.md`, `docs/adr/005-estrategia-testes.md:3`, `docs/adr/README.md`

**Interfaces:**
- Consumes: os comandos do spec ("Comandos") e a convenção de nomes ("Convenção de nomes").

- [ ] **Step 1:** `README.md`, em português:
  - o que é (sem dados reais; a primeira cliente é a Coophousing, como já diz o `CLAUDE.md` do repositório);
  - a stack;
  - as decisões de arquitetura, com uma linha por ADR e o link;
  - os requisitos (Node 26, pnpm, Docker);
  - como correr;
  - os comandos;
  - o estado do projeto.
- [ ] **Step 2:** `CONTRIBUTING.md`:
  - branches `tipo/#nr-descricao`;
  - Conventional Commits no título do PR;
  - `Closes #nr`;
  - squash merge;
  - a definição de pronto (ADR-004);
  - a tabela "o que cada PR tem de trazer" (ADR-005, secção 3);
  - a regra das exceções a checks.
- [ ] **Step 3:** `CLAUDE.md`:
  - a secção "Convenções" passa a ter a convenção de nomes, com a tabela de exemplos do spec;
  - retirar "ainda não está decidida" e "Até lá, não escrever código";
  - "Comandos" passa a listar os comandos do spec;
  - a nota "Docs em português, incluindo o README".
- [ ] **Step 4:** ADR-005: `Proposto` passa a `Aceite`, no ficheiro e no índice.
- [ ] **Step 5:** Correr `pnpm lint && pnpm typecheck && pnpm test:tudo`. Esperado: tudo PASS.
- [ ] **Step 6:** Commit `docs: README, CONTRIBUTING e convenções no CLAUDE.md`.

---

## Depois das tarefas

- Revisão de todo o branch e `/code-review` antes do PR.
- PR para `main` com o template do ADR-004 e `Closes #17`; o #17 passa para "Em revisão". Na descrição, listar os **comportamentos testados** (ADR-005) e as **decisões tomadas pelo caminho**.
