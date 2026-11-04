# Senior Care Platform

Plataforma SaaS multi-organização para gestão de respostas sociais para idosos (Estrutura Residencial, Centro de Dia, Apoio Domiciliário). Tem duas faces: **Gestão**, o backoffice web, e **Registo Diário**, uma PWA com PIN em dispositivos partilhados. Primeira cliente: Coophousing.

## Onde está cada coisa

- **Decisões de arquitetura:** `docs/adr/`. Começa pelo `docs/adr/README.md`. A stack está no ADR-001. **Não contrariar um ADR aceite**; se algo pedir uma mudança, propõe-se um ADR novo.
- **Tickets:** GitHub Issues + Project "Senior Care Platform" (`gh project view 1 --owner RafaelFerraz2002`). Épicos E0–E11 = issues com a label `epic`; as fases são as milestones M0–M4.
- **Requisitos funcionais:** no Notion (IDs como `RD-05`, `UT-03`), referidos em cada ticket na secção "Requisitos".

## Como se trabalha

1. Todo o trabalho nasce de um ticket. Se não houver ticket, cria-se um antes de começar.
2. Branch `tipo/#nr-descricao` (ex.: `feat/#42-registo-atividade`) a partir de `main`, atualizado.
3. Tickets de arquitetura ou funcionalidades novas passam por brainstorming → desenho aprovado → plano, **antes** de escrever código.
4. PR para `main` com `Closes #nr` e título em Conventional Commits (`feat(registo): …`, `docs(adr): …`). Entra por **squash merge**. A descrição do PR segue o template do ADR-004: "O que muda", a checklist "Pronto?" e `Closes #nr`. Sem secção "Como rever", sem rodapé "Generated with Claude Code" e sem link da sessão. Os commits também não levam a linha `Claude-Session`.
5. Ao começar um ticket, passa para "Em curso"; ao abrir o PR, para "Em revisão". Só o utilizador aprova o merge.
   Estados possíveis: `Backlog`, `Pronto`, `Em curso`, `Em revisão`, `Feito`.
   ```sh
   gh project item-edit 1 --owner RafaelFerraz2002 --url <url-do-issue> --field Status --value "Em curso"
   ```
6. **Nunca** fazer push direto para `main`, force push, nem merge sem pedido explícito.

## Regras que não se quebram

- **Nunca pôr dados reais** (utentes, funcionários, saúde da Coophousing ou do MySenior) no repositório, em seeds, em testes nem em issues. O repositório é público. Os dados de exemplo são sempre fictícios.
- **Nunca pôr segredos** (passwords, chaves, tokens) em ficheiros versionados. Só em variáveis de ambiente.
- Dados de saúde: qualquer funcionalidade que guarde, mostre ou exporte dados pessoais segue o ADR-006 (RGPD). Na dúvida, pergunta-se.
- **Nunca criar uma exceção a um check por iniciativa própria** (ADR-005, testes): subir um valor de referência, acrescentar um `v8 ignore`, pôr um teste em quarentena. Pergunta-se primeiro ao utilizador, com o motivo. Os testes de segurança e RGPD não têm exceção.

## Convenções

- **Língua:** documentação, issues, PRs e mensagens ao utilizador em **português de Portugal**. Docs em português, incluindo o README.
- **Nomes no código: o negócio em português (sem acentos), a técnica em inglês.** Na dúvida: se a palavra aparece nos requisitos do Notion ou na interface, é negócio e fica em português.

  | O quê                                            | Língua                                                     | Exemplo                                                           |
  | ------------------------------------------------ | ---------------------------------------------------------- | ----------------------------------------------------------------- |
  | Tabelas, colunas, entidades e módulos do domínio | Português; `snake_case` na base, `camelCase` no TypeScript | `utentes`, `registos_diarios`, `organizacao_id` / `organizacaoId` |
  | Rotas da API e das apps                          | Português, `kebab-case`                                    | `GET /utentes/:id`, `/registo-diario`                             |
  | Nomes dos testes e mensagens ao utilizador       | Português, frases                                          | `it('recusa ver utentes de outra organização')`                   |
  | Verbos, padrões e sufixos técnicos               | Inglês                                                     | `UtentesService.findById()`, `useUtentes()`, `*.controller.ts`    |
  | Pastas técnicas e ficheiros de configuração      | Inglês                                                     | `apps/api/src/common/`, `vitest.config.ts`                        |

  Os exemplos dos ADRs com `organization_id` são ilustrativos: no código é `organizacao_id`.

- **Decisões técnicas:** apresentar sempre o porquê **e** as alternativas rejeitadas. Escolher pelo que o projeto precisa.

## Comandos

- `pnpm install`; `pnpm dev` (sobe o `docker compose`, a API e as apps; os serviços ficam a correr).
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (unitários e componentes, sem Docker).
- `pnpm test:integracao` (Docker); `pnpm test:e2e` (Docker e browsers do Playwright); `pnpm test:tudo` (todos).
- `pnpm gerar:api-client`: regenera o `openapi.json` e o cliente depois de mudar a API.
- `pnpm verificar:tamanho` (depois de `pnpm build`): compara o JavaScript das apps com `tamanho-apps.json`.
