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
4. PR para `main` com `Closes #nr` e título em Conventional Commits (`feat(registo): …`, `docs(adr): …`). Entra por **squash merge**. A descrição do PR tem só "O que muda" (e um resumo, se ajudar) e `Closes #nr`. Sem secção "Como rever", sem rodapé "Generated with Claude Code" e sem link da sessão. Os commits também não levam a linha `Claude-Session`.
5. Ao abrir o PR, o ticket passa para "Em revisão" no Project. Só o utilizador aprova o merge.
6. **Nunca** fazer push direto para `main`, force push, nem merge sem pedido explícito.

## Regras que não se quebram

- **Nunca pôr dados reais** (utentes, funcionários, saúde da Coophousing ou do MySenior) no repositório, em seeds, em testes nem em issues. O repositório é público. Os dados de exemplo são sempre fictícios.
- **Nunca pôr segredos** (passwords, chaves, tokens) em ficheiros versionados. Só em variáveis de ambiente.
- Dados de saúde: qualquer funcionalidade que guarde, mostre ou exporte dados pessoais segue o ADR-006 (RGPD), quando existir. Na dúvida, pergunta-se.

## Convenções

- **Língua:** documentação, issues, PRs e mensagens ao utilizador em **português de Portugal**. Os nomes de domínio no código seguem o vocabulário do negócio (`utentes`, `registo-diario`), como no ADR-001.
- **Decisões técnicas:** apresentar sempre o porquê **e** as alternativas rejeitadas. Escolher pelo que o projeto precisa.
- **Comandos de build, teste e lint:** ainda não existem; são definidos no #17 (scaffolding) e acrescentados aqui nessa altura.
