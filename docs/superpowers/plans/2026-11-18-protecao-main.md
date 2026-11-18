# Proteção do `main` (#24): plano de implementação

> **Para quem executa:** execução nativa, tarefa a tarefa, com uma revisão do branch inteiro no fim. Os passos usam caixas (`- [ ]`).

**Objetivo:** aplicar no GitHub as regras do ADR-004 (processo de desenvolvimento) e pôr o gitleaks no CI.

**Arquitetura:** o ruleset vive em `.github/rulesets/main.json` e aplica-se com `gh api`. O gitleaks corre na imagem oficial fixada por digest, num job `segredos` no CI e na execução noturna. O detetor de exceções (`packages/ci`) ganha o tipo `segredo-ignorado`.

**Stack:** GitHub Actions, rulesets do GitHub, gitleaks 8.30.1, CodeRabbit, Vitest.

**Desenho:** `docs/superpowers/specs/2026-11-18-protecao-main-design.md`

## Restrições globais

- Os nomes dos jobs são estáveis e exatos: `segredos` (novo), mais os 8 do #18.
- Imagem do gitleaks: `ghcr.io/gitleaks/gitleaks@sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f` (v8.30.1), sempre com `--redact`.
- As ações ficam fixadas por SHA e com `persist-credentials: false`, como no #18.
- Nunca se põe um segredo real em lado nenhum; o segredo da prova é inventado e só vai para um PR descartável.
- Aplicar o ruleset e fazer o merge pedem confirmação do dono.
- Documentação em português de Portugal; os nomes dos testes são frases em português.

## Pontos a vigiar

1. **Commits do PR.** O `pull_request` faz checkout de um commit de merge. O `origin/main..HEAD` tem de incluir os commits do branch, e o `fetch-depth: 0` é obrigatório.
2. **Repositório montado no contentor.** O git dentro da imagem pode recusar um repositório de outro dono (`dubious ownership`). Corre-se com `--user` do runner, ou com `safe.directory`.
3. **Contexto dos checks.** O nome do check tem de bater com o nome do job (`titulo-pr` vem de outro workflow, mas o contexto é só o nome do job).
4. **Linha `gitleaks:allow` dentro do próprio detetor.** O ficheiro do detetor e os testes dele já estão em `FICHEIROS_IGNORADOS`.
5. **Linhas de `.gitleaksignore` com comentário** (`#`). Contam também, porque a regra é simples: qualquer linha acrescentada.

---

### Tarefa 1: tipo de exceção `segredo-ignorado`

**Ficheiros:** `packages/ci/src/excecoes.ts`, `packages/ci/src/excecoes.test.ts`, `packages/ci/src/relatorio.ts`, `packages/ci/src/relatorio.test.ts`.

- [ ] Testes novos em `excecoes.test.ts` (devem falhar antes do código):
  - `'marca um gitleaks:allow em qualquer ficheiro'`: diff de `config/x.yml` com `+token: abc # gitleaks:allow` dá `[{ tipo: 'segredo-ignorado', ficheiro: 'config/x.yml', linha, texto }]`; o mesmo num `.ts`.
  - `'marca cada linha acrescentada ao .gitleaksignore'`: duas linhas dão duas exceções `segredo-ignorado`, com as linhas certas.
  - `'marca uma só vez a mudança ao .gitleaks.toml'`: três linhas acrescentadas dão uma exceção, na primeira.
- [ ] `relatorio.test.ts`: a lista de tipos com nome passa a incluir `'segredo-ignorado'`.
- [ ] Implementação:
  - `TipoExcecao` ganha `'segredo-ignorado'`;
  - o `.gitleaks.toml` segue o mecanismo do `app-sizes.json`: uma exceção por ficheiro, generalizado para um conjunto de ficheiros "uma vez por ficheiro";
  - o `.gitleaksignore` dá uma exceção por linha;
  - `gitleaks:allow` em qualquer ficheiro.
  - `NOMES_TIPOS['segredo-ignorado'] = 'Segredo marcado como falso alarme (gitleaks)'`.
- [ ] `pnpm --filter @scp/ci test` e `pnpm lint` verdes.
- [ ] Commit: `feat(ci): o relatório mostra segredos marcados como falso alarme`.

### Tarefa 2: job `segredos` no CI e no noturno

**Ficheiros:** `.github/workflows/ci.yml`, `.github/workflows/noturno.yml`.

- [ ] **No `ci.yml`**, o job `segredos`:
  - checkout com `fetch-depth: 0` e `persist-credentials: false`, sem setup de Node;
  - corre `docker run --rm --user "$(id -u):$(id -g)" -v "$GITHUB_WORKSPACE:/repo" -w /repo <imagem> git --redact --no-banner -v --log-opts="origin/main..HEAD" .`;
  - comentário com a versão (`v8.30.1`), como no Playwright.
- [ ] **No `noturno.yml`**, o job `segredos`: igual, sem `--log-opts` (histórico inteiro). O job `issue` passa a ter `needs: [e2e-browsers, dependencias, segredos]`. O comentário do cabeçalho passa a mencionar os segredos.
- [ ] Verificar localmente que os mesmos argumentos funcionam: `gitleaks git --redact --no-banner -v --log-opts="origin/main..HEAD" .` → "no leaks found".
- [ ] Commit: `ci: gitleaks em cada PR e na execução noturna`.

### Tarefa 3: template de PR, CodeRabbit e ruleset

**Ficheiros:**

- criar: `.github/pull_request_template.md`, `.coderabbit.yaml`, `.github/rulesets/main.json`.

**Passos:**

- [ ] **Template:** o bloco da secção 3 do ADR-004, igual letra a letra.
- [ ] **`.coderabbit.yaml`:**
  - começa com `# yaml-language-server: $schema=https://coderabbit.ai/integrations/schema.v2.json`;
  - `language: pt-PT`;
  - em `reviews`:
    - `profile: chill`;
    - `auto_approvals.enabled: false`;
    - `poem: false`;
    - `in_progress_fortune: false`;
    - `path_filters` a excluir `pnpm-lock.yaml`, `**/*.gen.ts`, `**/openapi.json` e o cliente gerado (`packages/api-client/src/**`, a confirmar no repositório);
    - `path_instructions` para `apps/api/**` (multi-organização, `withOrganizacao`, organização nunca do cliente, logs sem dados pessoais), `**/*` (sem dados reais nem segredos, convenção de nomes) e `.github/workflows/**` (permissões mínimas, ações por SHA, nunca `pull_request_target`);
  - `knowledge_base.code_guidelines.filePatterns`: `CLAUDE.md`, `CONTRIBUTING.md`, `docs/adr/*.md`.
  - Validar contra o esquema (YAML válido e chaves existentes).
- [ ] **`main.json`:** o ruleset da decisão 4 do desenho:
  - `name: "main"`, `target: "branch"`, `enforcement: "active"`;
  - `conditions.ref_name.include: ["~DEFAULT_BRANCH"]`;
  - `bypass_actors: [{ actor_id: 5, actor_type: "RepositoryRole", bypass_mode: "pull_request" }]`;
  - regras `deletion` e `non_fast_forward`;
  - regra `pull_request` com `required_approving_review_count: 0`, `required_review_thread_resolution: true` e `allowed_merge_methods: ["squash"]`;
  - regra `required_status_checks` com `strict_required_status_checks_policy: true` e os 9 contextos, cada um com `integration_id: 15368`.
- [ ] Prettier verde nos três ficheiros.
- [ ] Commit: `chore: template de PR, configuração do CodeRabbit e ruleset do main`.

### Tarefa 4: documentação

- [ ] **`CONTRIBUTING.md`:**
  - a frase de abertura da secção CI passa a "obrigatórios no ruleset do `main`";
  - linha `segredos` na tabela;
  - `segredo-ignorado` na lista do relatório;
  - subsecção "Regras do `main`" com:
    - os 9 checks obrigatórios;
    - o branch atualizado antes do merge;
    - as conversas resolvidas;
    - o bypass só em emergência, com a justificação escrita no PR;
    - os comandos para reaplicar o ruleset;
  - linha do `segredos` na execução noturna.
- [ ] **ADR-004:** a tabela de transição marca CI, ruleset, CodeRabbit e template como em vigor desde o #24.
- [ ] Commit: `docs: regras do main e gitleaks no CONTRIBUTING e no ADR-004`.

### Tarefa 5: PR, ruleset e provas

- [ ] Push e PR `chore: proteção do main, template de PR, CodeRabbit e gitleaks` com o template e `Closes #24`; o #24 passa a "Em revisão".
- [ ] CI verde, incluindo o `segredos`.
- [ ] **Confirmação do dono:**
  - aplicar o ruleset (`gh api -X POST repos/{owner}/{repo}/rulesets --input .github/rulesets/main.json`);
  - instalar o CodeRabbit.
- [ ] **Provas da decisão 9 do desenho:**
  - push direto recusado;
  - `lint-tipos` vermelho dá `BLOCKED` (commit temporário revertido);
  - conversa por resolver dá `BLOCKED`;
  - `segredos` vermelho num PR descartável;
  - o CodeRabbit comenta.
- [ ] Revisão do branch inteiro por um subagente; corrigir o que encontrar.
- [ ] Resultados das provas no PR; merge só a pedido do dono.
