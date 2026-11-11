# Como contribuir

Todo o trabalho segue o processo do [ADR-004](docs/adr/004-processo-desenvolvimento.md) (processo de desenvolvimento e code review). Documentação, issues, PRs e mensagens ao utilizador escrevem-se em português de Portugal.

## Fluxo

1. **Todo o trabalho nasce de um issue.** Se não houver, cria-se antes de começar.
2. **Branch** `tipo/#nr-descricao` a partir de `main` atualizado, por exemplo `feat/#42-registo-atividade`.
3. **Commits** em [Conventional Commits](https://www.conventionalcommits.org/) (`feat(registo): …`, `fix(api): …`, `docs(adr): …`). Os hooks (lefthook) formatam e verificam ao fazer commit; não se contornam.
4. **PR para `main`** com o título em Conventional Commits e `Closes #nr` na descrição. A descrição segue o template do ADR-004: "O que muda", a checklist "Pronto?" e `Closes #nr`.
5. **Squash merge**, feito pelo dono do repositório. Nunca há push direto para `main`.

## Definição de pronto

Segundo o ADR-004, um ticket está pronto quando:

1. cumpre todos os critérios de aceitação do issue;
2. tem testes para o comportamento novo e o CI está verde;
3. a documentação afetada está atualizada;
4. não tem dados reais nem segredos;
5. passou pelo review e tem todas as conversas resolvidas;
6. o dono fez o merge, que vale como aprovação, e o issue está em **Feito**.

## O que cada PR tem de trazer

Resumo do [ADR-005](docs/adr/005-estrategia-testes.md) (estratégia de testes), secção 3:

| Mudança                                    | Teste exigido                                                                                                    |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Correção de um bug                         | Um teste que reproduz o bug e falha antes da correção.                                                           |
| Endpoint novo ou alterado                  | Integração com três casos: o normal; sem permissão (recusado); outra organização (não vê, não altera, 0 linhas). |
| Regra de negócio                           | Unitários, incluindo os limites (zero, máximo, datas na fronteira).                                              |
| Tabela, vista ou função nova               | O teste de catálogo do ADR-002 apanha-a sozinho; acrescenta-se ao gerador de dados fictícios.                    |
| Secção sensível nova (saúde, documentos…)  | O teste de consulta sensível do ADR-006 passa a cobri-la.                                                        |
| Ecrã ou módulo novo                        | O caminho feliz Playwright desse módulo.                                                                         |
| Fluxo crítico alterado                     | O teste ponta a ponta desse fluxo, atualizado.                                                                   |
| Só documentação ou configuração sem código | n/a.                                                                                                             |

Nas regras de negócio e nas correções de bugs, o teste escreve-se primeiro e vê-se falhar. Os testes de integração e ponta a ponta não simulam a base de dados nem a nossa API. Os nomes dos testes são frases em português.

## CI

Cada PR corre os checks abaixo (`.github/workflows/`). Os nomes são estáveis: o ruleset do #24 (`main` protegido) vai torná-los obrigatórios.

| Check          | O que verifica                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| `lint-tipos`   | `pnpm lint` e a verificação de tipos dos pacotes afetados.                                              |
| `unitarios`    | Testes unitários e de componentes, com cobertura.                                                       |
| `integracao`   | Testes de integração com Postgres real, com cobertura.                                                  |
| `seguranca`    | Testes de segurança (`pnpm test:seguranca`). Sem eles, o resumo diz "Ainda não há testes de segurança." |
| `cobertura`    | Junta a cobertura dos três jobs acima e exige pelo menos 80% das linhas alteradas que contam.           |
| `e2e`          | Testes ponta a ponta com Playwright (Chromium e, no Registo Diário, iPad com WebKit).                   |
| `tamanho-apps` | Compila as apps e compara o JavaScript com o `app-sizes.json`.                                          |
| `relatorio`    | Publica o "Relatório do CI" no PR (ver abaixo). Não falha o PR por si.                                  |
| `titulo-pr`    | O título do PR tem de estar em Conventional Commits.                                                    |

### Testes de segurança

Os testes de segurança têm o sufixo `.seguranca.test.ts`. Na API ficam em `apps/api/test/` (ou `apps/api/src/`); nos outros pacotes, ao lado do código. Só o `pnpm test:seguranca` os corre: o `pnpm test` e o `pnpm test:integration` excluem-nos. O `pnpm test:all` inclui-os.

### Cobertura

O que conta é o que está em `packages/config/vitest/coverage.mjs`: os ficheiros `.ts` em `src/` da API, das apps e dos pacotes `shared`, `fake-data` e `ci`. Ficam de fora os `.tsx`, os testes, o código gerado, as configurações, as migrações e os pontos de entrada (`main.ts`, `*-cli.ts`). Por isso, **a lógica das apps (hooks, estado, a fila offline) vive em ficheiros `.ts`; os `.tsx` só desenham e não contam para a cobertura**. Um PR sem linhas que contem (só docs ou só `.tsx`) passa este check.

### Relatório do CI

O job `relatorio` deixa no PR um comentário "Relatório do CI", atualizado a cada execução. Mostra a cobertura das linhas alteradas, a cobertura global dos pacotes testados neste PR (só informativa; junta unitários e integração dos pacotes que o `--affected` correu, por isso não é a cobertura do repositório) e as **exceções introduzidas pelo PR**. Conta como exceção, nas linhas acrescentadas:

- um `v8 ignore`;
- um teste desligado (`.skip(`, `.todo(`, `.fixme(`);
- um `eslint-disable`;
- um `@ts-ignore` ou `@ts-expect-error`;
- uma mudança ao `app-sizes.json`;
- uma vulnerabilidade ignorada no `auditConfig.ignoreGhsas` do `pnpm-workspace.yaml`.

O relatório só avisa: cada exceção precisa da aprovação do dono, como na secção seguinte. Se o job `cobertura` falhar, o relatório sai na mesma: abaixo de 80% mostra a percentagem e só diz "indisponível" se o job não chegou ao fim.

Hoje a lista `ignoreGhsas` está vazia. O `pnpm-workspace.yaml` tem uma substituição pontual (`js-yaml@4.2.0` passa a `4.3.2`), aprovada pelo dono: corrige a vulnerabilidade em vez de a ignorar, por isso não é uma exceção. Existe uma exceção aprovada: o teste offline do Registo Diário não corre no Firefox (limitação do Playwright; o motivo está no próprio teste, em `e2e/tests/registo.spec.ts`).

### Execução noturna

O workflow `noturno.yml` corre todos os dias às 3h (UTC) sobre o `main`, e também à mão. Tem três jobs:

- `e2e-browsers`: os testes ponta a ponta em Chromium, Firefox e WebKit (mais o iPad do dia a dia). Salta-se se o `main` não mudou desde a última execução com sucesso (numa execução à mão corre sempre). O Firefox só corre à noite. Localmente: `E2E_ALL_BROWSERS=1 pnpm test:e2e`, depois de `pnpm --filter @scp/e2e exec playwright install firefox webkit`.
- `dependencias`: `pnpm audit --audit-level high`.
- `issue`: se algum dos anteriores falhar, abre um issue com a label `noturno` ou, se já houver um aberto, acrescenta um comentário.

Os jobs `e2e-browsers` e `dependencias` só falham; é o `issue` que avisa. **O GitHub desliga os workflows agendados de um repositório sem atividade durante 60 dias.** Se o repositório ficar parado, convém ver na aba Actions se o "Noturno" continua ativo e voltar a ligá-lo se não estiver.

## Regras que não se quebram

- **Sem dados reais** (utentes, funcionários, saúde) no repositório, em seeds, testes ou issues. Os dados de exemplo são sempre fictícios.
- **Sem segredos** em ficheiros versionados. Só em variáveis de ambiente (`.env` está no `.gitignore`; só o `.env.example` é versionado).
- Qualquer funcionalidade que guarde, mostre ou exporte dados pessoais segue o [ADR-006](docs/adr/006-rgpd-seguranca.md) (proteção de dados, RGPD e segurança).

## Exceções a checks

Nunca se cria uma exceção a um check por iniciativa própria: subir um valor de referência (como o de `app-sizes.json`), acrescentar um `v8 ignore` ou pôr um teste em quarentena. Pergunta-se primeiro ao dono, com o motivo. Os testes de segurança e RGPD não têm exceção.

## Convenção de nomes

O negócio em português, a técnica em inglês: se a palavra aparece nos requisitos, no ecrã ou num URL, é português; se não, é inglês. Os nomes dos testes, as mensagens, os comentários e a documentação ficam em português. O formato (`kebab-case` nos ficheiros e pastas, `camelCase`, `PascalCase`, `UPPER_CASE`) é verificado pelo `pnpm lint`. Os detalhes e exemplos estão no [`CLAUDE.md`](CLAUDE.md).

## Comandos

Ver a tabela de comandos no [`README.md`](README.md). Antes de abrir o PR: `pnpm lint && pnpm typecheck && pnpm test`. O CI corre ainda a integração, a segurança, a cobertura e o e2e.
