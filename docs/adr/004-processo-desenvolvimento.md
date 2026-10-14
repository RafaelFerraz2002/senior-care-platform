# ADR-004: Processo de desenvolvimento e code review

- **Estado:** Proposto
- **Data:** 2026-10-14
- **Ticket:** [#21](https://github.com/RafaelFerraz2002/senior-care-platform/issues/21)

## Contexto

O projeto é desenvolvido por um programador com apoio de IA, num repositório público. É preciso decidir como uma mudança chega ao `main`: que passos tem, quem a revê, que regras o GitHub impõe e quando um ticket está pronto.

### Critérios de decisão

| Critério | O que sabemos |
|---|---|
| Equipa | Um programador, que é também o dono do repositório e o único a aprovar merges. O código é escrito em grande parte com apoio de IA. |
| Repositório | Público até à reavaliação no [#26](https://github.com/RafaelFerraz2002/senior-care-platform/issues/26) (jan 2027). Um dado real ou um segredo publicado não se apaga de forma fiável. |
| Rastreabilidade | Cada mudança tem de estar ligada a um ticket e ter registo do porquê. |
| Histórico | O `main` tem de ser fácil de ler e de reverter, um ticket de cada vez. |
| Review | Não há um segundo programador. O review tem de vir de ferramentas, sem substituir a decisão do dono. |
| Custo | Ferramentas grátis ou já incluídas na subscrição do Claude. |

## Opções consideradas

### Integração no `main`

#### A. Tudo por PR, com squash merge ✅

- **Prós:**
  - um commit por ticket no `main`, com o título do PR em Conventional Commits;
  - o PR guarda o porquê e as conversas do review;
  - o GitHub fecha o issue pelo `Closes #nr`;
  - os commits intermédios do branch podem ser livres, porque desaparecem no squash.
- **Contras:** mesmo as mudanças pequenas (uma gralha) exigem ticket, branch e PR.

#### B. Push direto para o `main` (trunk-based a solo)

- **Prós:** o mais rápido, sem cerimónia.
- **Contras:** não há momento para o review nem para o CI correr antes de a mudança entrar; perde-se a ligação ao ticket e o registo do porquê.

#### C. PR com merge commit ou rebase merge

- **Prós:** mantém todos os commits do branch.
- **Contras:** o `main` fica com os commits intermédios ("corrige gralha", "wip"), o que obriga a disciplina em cada commit (commitlint) e torna mais difícil reverter um ticket inteiro.

### Review

#### A. `/code-review` do Claude Code + CodeRabbit, com aprovação do dono ✅

- **Prós:** dois revisores independentes, ambos grátis (o `/code-review` vem na subscrição; o CodeRabbit é grátis para repositórios públicos). Os comentários ficam no PR.
- **Contras:** o review por IA pode deixar passar erros ou dar falsos positivos.

#### B. GitHub Action do Claude (`claude-code-action`) em cada PR

- **Prós:** corre sozinho, sem ser preciso pedir.
- **Contras:** exige uma chave de API paga e guardada como segredo do repositório. Fica para a reavaliação no [#26](https://github.com/RafaelFerraz2002/senior-care-platform/issues/26).

#### C. Só o review do dono

- **Contras:** quem escreve não é bom revisor do próprio trabalho, sobretudo com código gerado em volume.

## Decisão

**Tudo entra por PR com squash merge, revisto por `/code-review` e CodeRabbit, e só o dono aprova o merge.**

### 1. Fluxo de um ticket

1. O issue passa a **Em curso** no Project, e cria-se o branch `tipo/#nr-descricao` a partir do `main` atualizado.
2. Commits livres no branch, mas com mensagens descritivas.
3. Abre-se o PR para o `main`: título em Conventional Commits (`feat(registo): …`, `docs(adr): …`), corpo segundo o template (secção 3) com `Closes #nr`. O issue passa a **Em revisão**.
4. O CI tem de ficar verde.
5. Review: corre-se o `/code-review`, que deixa os comentários no PR, e o CodeRabbit comenta sozinho.
6. Cada conversa é corrigida, ou respondida com a justificação, e depois marcada como resolvida.
7. O dono aprova e faz o squash merge. O branch é apagado e o issue fecha e passa a **Feito**.

### 2. Regras do GitHub

| Decisão | Porquê | Rejeitado |
|---|---|---|
| **Ruleset no `main`: só por PR, sem aprovação obrigatória** | Garante que tudo passa por um PR. A aprovação não pode ser obrigatória porque o GitHub não deixa o autor aprovar o próprio PR, e não há outro programador. | **Aprovação obrigatória:** bloquearia todos os PRs. |
| **Status checks do CI obrigatórios** | Nada entra com o build, o lint ou os testes partidos. | Checks opcionais: dependem de alguém reparar. |
| **Conversas resolvidas obrigatórias** (*Require conversation resolution before merging*) | Nenhum comentário do review fica sem resposta. Um comentário errado também se resolve, mas com a justificação escrita. | Ignorar comentários: o review deixa de servir. |
| **Sem force push nem eliminação do `main`** | O histórico publicado não se reescreve. | — |
| **Sem bypass, nem para o admin** | As regras valem sempre. Numa emergência, o dono desliga o ruleset e volta a ligá-lo, e isso fica no registo de auditoria. | **Bypass para o admin:** torna as regras opcionais sem deixar rasto claro. |
| **Só squash merge**, com o título do commit = título do PR e a mensagem = corpo do PR | Um commit por ticket, com o porquê na mensagem. | Merge commit e rebase merge (ver Opções). |
| **Apagar o branch depois do merge** | Não se acumulam branches mortos. | Apagar à mão. |

O ruleset, o template e o CodeRabbit configuram-se no [#24](https://github.com/RafaelFerraz2002/senior-care-platform/issues/24). As definições de merge (só squash, título e mensagem, apagar o branch) ficam aplicadas no #21.

### 3. Template de PR

O ficheiro `.github/pull_request_template.md` é criado no [#24](https://github.com/RafaelFerraz2002/senior-care-platform/issues/24) com este conteúdo:

```markdown
## O que muda
<!-- O quê e porquê, em poucas linhas. Isto vai para a mensagem do commit. -->

## Pronto?
- [ ] Critérios de aceitação do ticket cumpridos
- [ ] Testes novos ou atualizados, e CI verde
- [ ] Docs atualizadas (README, ADR, CLAUDE.md), se aplicável
- [ ] Sem dados reais nem segredos
- [ ] Review feito e conversas resolvidas

Closes #
```

- A linha "Sem dados reais nem segredos" está na checklist porque o repositório é público. É a regra que mais custa se falhar, por isso tem um visto explícito em cada PR.
- Um PR sem código marca "n/a" na linha dos testes, sem a apagar.
- **Rejeitado:** um template diferente para cada tipo de PR (feat, docs, fix), que é mais manutenção do que ganho com um só programador; e uma secção "Como testar", porque os passos de teste ficam no CI e nos testes, não no texto do PR.

### 4. Definição de pronto

Um ticket está pronto quando:

1. Cumpre todos os critérios de aceitação do issue.
2. Tem testes para o comportamento novo, e o CI está verde. Os testes são exigidos a partir do momento em que houver código; o tipo de teste define-se no ADR-005 ([#22](https://github.com/RafaelFerraz2002/senior-care-platform/issues/22)).
3. A documentação afetada está atualizada.
4. Não tem dados reais nem segredos.
5. Passou pelo review e tem todas as conversas resolvidas.
6. O dono aprovou e fez o merge, e o issue está em **Feito**.

### 5. Transição

O processo completo depende de peças que ainda não existem. Até lá:

| Peça | Até existir | Quando passa a valer |
|---|---|---|
| CI (status checks) | Não há checks obrigatórios. Um PR só de docs entra sem CI. | [#18](https://github.com/RafaelFerraz2002/senior-care-platform/issues/18): os jobs do CI passam a obrigatórios no ruleset. |
| Ruleset do `main` | As regras valem por disciplina: não há push direto para o `main` nem merge sem review. | [#24](https://github.com/RafaelFerraz2002/senior-care-platform/issues/24) |
| CodeRabbit | O review é só o `/code-review`. | [#24](https://github.com/RafaelFerraz2002/senior-care-platform/issues/24) |
| Template de PR | O conteúdo da secção 3 copia-se à mão para cada PR. | [#24](https://github.com/RafaelFerraz2002/senior-care-platform/issues/24) |
| Testes na definição de pronto | "n/a" enquanto não houver código. | [#17](https://github.com/RafaelFerraz2002/senior-care-platform/issues/17) (scaffolding) e ADR-005 ([#22](https://github.com/RafaelFerraz2002/senior-care-platform/issues/22)) |

## Consequências

**Positivas**
- O `main` tem um commit por ticket, com título em Conventional Commits e ligado ao issue: fácil de ler e de reverter.
- Cada mudança tem registo do porquê, no PR e nas conversas do review.
- O review fica separado de quem escreve, mesmo com um só programador.
- O mesmo fluxo para tudo, sem exceções a decidir caso a caso.

**Negativas e riscos**
- **Mudanças pequenas também passam pelo fluxo completo.** Aceita-se o custo em troca de não haver exceções.
- **O review por IA pode falhar**, deixando passar erros ou dando falsos positivos. A aprovação do dono continua a ser obrigatória, e a ferramenta é reavaliada no [#26](https://github.com/RafaelFerraz2002/senior-care-platform/issues/26).
- **Sem bypass, um ruleset mal configurado pode bloquear o `main`.** O dono desliga e volta a ligar o ruleset, o que fica no registo de auditoria.
- **Até ao [#24](https://github.com/RafaelFerraz2002/senior-care-platform/issues/24), as regras dependem só de disciplina.**

**Ligações a outros ADRs**
- ADR-001: o CI usa as ferramentas escolhidas lá, incluindo a validação do título do PR em Conventional Commits.
- ADR-005 ([#22](https://github.com/RafaelFerraz2002/senior-care-platform/issues/22)): define que testes contam para a definição de pronto.
- ADR-006 ([#23](https://github.com/RafaelFerraz2002/senior-care-platform/issues/23)): a linha "sem dados reais nem segredos" é a parte desse ADR que entra no processo. A verificação automática de segredos (secret scanning) decide-se lá ou no [#24](https://github.com/RafaelFerraz2002/senior-care-platform/issues/24).
