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

## Regras que não se quebram

- **Sem dados reais** (utentes, funcionários, saúde) no repositório, em seeds, testes ou issues. Os dados de exemplo são sempre fictícios.
- **Sem segredos** em ficheiros versionados. Só em variáveis de ambiente (`.env` está no `.gitignore`; só o `.env.example` é versionado).
- Qualquer funcionalidade que guarde, mostre ou exporte dados pessoais segue o [ADR-006](docs/adr/006-rgpd-seguranca.md) (proteção de dados, RGPD e segurança).

## Exceções a checks

Nunca se cria uma exceção a um check por iniciativa própria: subir um valor de referência (como o de `tamanho-apps.json`), acrescentar um `v8 ignore` ou pôr um teste em quarentena. Pergunta-se primeiro ao dono, com o motivo. Os testes de segurança e RGPD não têm exceção.

## Convenção de nomes

O negócio em português, a técnica em inglês. Os detalhes e exemplos estão no [`CLAUDE.md`](CLAUDE.md).

## Comandos

Ver a tabela de comandos no [`README.md`](README.md). Antes de abrir o PR: `pnpm lint && pnpm typecheck && pnpm test`.
