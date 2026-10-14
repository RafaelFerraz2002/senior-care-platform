# Architecture Decision Records (ADR)

Um ADR regista **uma decisão de arquitetura**: o contexto, as opções que foram pesadas, o que se decidiu e as consequências. Serve para que, daqui a meses, se perceba *porquê* o sistema é assim, e não só *como* é.

## Regras

- Um ficheiro por decisão: `NNN-titulo-curto.md`, com numeração sequencial.
- Cada ADR nasce de um ticket no GitHub e entra por PR, como o resto do código.
- Um ADR aceite não se reescreve. Se a decisão mudar, cria-se um ADR novo com estado *Substitui ADR-NNN*, e o antigo passa a *Substituído por ADR-MMM*.
- Escritos em português de Portugal.

## Índice

| ADR | Título | Estado | Ticket |
|---|---|---|---|
| [001](001-stack.md) | Escolha da stack | Aceite | [#13](https://github.com/RafaelFerraz2002/senior-care-platform/issues/13) |
| 002 | Estratégia multi-organização | Por escrever | [#14](https://github.com/RafaelFerraz2002/senior-care-platform/issues/14) |
| 003 | Autenticação web + PIN em dispositivo partilhado | Por escrever | [#15](https://github.com/RafaelFerraz2002/senior-care-platform/issues/15) |
| [004](004-processo-desenvolvimento.md) | Processo de desenvolvimento e code review | Proposto | [#21](https://github.com/RafaelFerraz2002/senior-care-platform/issues/21) |
| 005 | Estratégia de testes | Por escrever | [#22](https://github.com/RafaelFerraz2002/senior-care-platform/issues/22) |
| 006 | Proteção de dados, RGPD e segurança | Por escrever | [#23](https://github.com/RafaelFerraz2002/senior-care-platform/issues/23) |

## Modelo

```markdown
# ADR-NNN: Título

- **Estado:** Proposto | Aceite | Substituído por ADR-MMM
- **Data:** AAAA-MM-DD
- **Ticket:** #NN

## Contexto
O problema, as restrições e os critérios de decisão.

## Opções consideradas
As alternativas, com prós e contras.

## Decisão
O que se escolheu e porquê.

## Consequências
O que fica mais fácil, o que fica mais difícil, os riscos e o que fica para outros ADRs.
```
