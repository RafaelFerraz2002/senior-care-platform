# Proteção do `main`, template de PR, CodeRabbit e gitleaks (#24): desenho

- **Ticket:** [#24](https://github.com/RafaelFerraz2002/senior-care-platform/issues/24)
- **Data:** 2026-11-18
- **Estado:** aprovado pelo dono

## Porquê

Quem faz o merge não lê o código: confia no CI, nos testes e no review. Hoje os 9 checks do #18 correm em cada PR, mas nada impede um merge com um check vermelho, um push direto para o `main` ou um comentário do review por responder. O ADR-004 (processo de desenvolvimento) decidiu as regras; este ticket aplica-as no GitHub. O ADR-005 (estratégia de testes) e o ADR-006 (RGPD e segurança) passam para aqui o `gitleaks` no CI.

É também a última peça antes do loop noturno do #38: um ticket por noite só pode correr sozinho se o `main` estiver protegido.

## Âmbito

**Dentro:**

- o ruleset do `main`, guardado no repositório e aplicado no GitHub;
- o job `segredos` (gitleaks) no CI de cada PR e na execução noturna;
- o detetor de exceções do relatório passa a apanhar segredos marcados como falso alarme;
- o template de PR;
- a configuração do CodeRabbit;
- as provas de que as regras funcionam;
- a documentação: `CONTRIBUTING.md` e a tabela de transição do ADR-004.

**Fora:**

- detetar dados pessoais (NIF, número de utente): o gitleaks não foi feito para isso e os dados fictícios dariam falsos alarmes. O CodeRabbit corre o Presidio por defeito, o que ajuda no review sem bloquear;
- verificar que o ruleset aplicado é igual ao ficheiro (pode ir para o #41);
- as melhorias do CI do #41.

## Decisões

### 1. Checks obrigatórios

Ficam obrigatórios 9 checks: `lint-tipos`, `unitarios`, `integracao`, `seguranca`, `cobertura`, `e2e`, `tamanho-apps`, `titulo-pr` e `segredos`. O `relatorio` não fica, porque só informa.

Cada check fica preso à app do GitHub Actions (`integration_id` 15368): outra app não consegue dar o check como verde.

_Rejeitado:_ o `relatorio` obrigatório, que bloquearia o merge por uma falha a publicar um comentário.

### 2. Branch atualizado antes do merge

O ruleset exige que o branch esteja atualizado com o `main` (`strict_required_status_checks_policy`). Quando outro PR entra primeiro, carrega-se em "Update branch" e o CI corre de novo (cerca de 2 minutos).

_Rejeitado:_ não exigir. Dois PRs verdes em separado podem partir o `main` juntos, e o loop do #38 vai abrir PRs em paralelo com os do dia.

### 3. Ruleset como ficheiro

O ruleset fica em `.github/rulesets/main.json`, no formato da API do GitHub, e aplica-se com `gh api`. Uma mudança às regras passa por um PR e fica no histórico.

_Rejeitado:_ configurar só na interface do GitHub, sem registo nem review; Terraform, desproporcionado para um repositório.

### 4. Regras do ruleset

Aplicam-se ao branch por omissão (`~DEFAULT_BRANCH`):

| Regra                | Valor                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------- |
| Só por PR            | Sem aprovação obrigatória (o GitHub não deixa o autor aprovar o próprio PR).           |
| Conversas resolvidas | Obrigatórias.                                                                          |
| Método de merge      | Só squash, a reforçar a definição do repositório.                                      |
| Status checks        | Os 9 da decisão 1, presos ao GitHub Actions, com o branch atualizado.                  |
| Force push           | Bloqueado (`non_fast_forward`).                                                        |
| Apagar o `main`      | Bloqueado (`deletion`).                                                                |
| Bypass               | Só o papel de admin do repositório, só em pull requests (`bypass_mode: pull_request`). |

_Rejeitado:_ commits assinados e merge queue, que dão trabalho sem ganho para um só programador.

### 5. gitleaks

- **Em cada PR**, um job `segredos` no `ci.yml` varre todos os commits do PR (`origin/main..HEAD`). Os commits intermédios ficam públicos no branch mesmo depois do squash, por isso não basta varrer o resultado final.
- **Na execução noturna**, um job `segredos` no `noturno.yml` varre o histórico inteiro. As regras do gitleaks vão mudando e podem apanhar coisas antigas. Se falhar, abre o issue `noturno` como os outros jobs.
- **Imagem:** a imagem oficial `ghcr.io/gitleaks/gitleaks:v8.30.1`, fixada pela impressão digital (`sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f`), como a do Playwright.
- **Regras:** as de origem, sem configuração própria.
- **Saída:** `--redact`, porque os registos do CI são públicos e um segredo encontrado não pode ir parar lá.
- **Ponto de partida:** o histórico atual (78 commits) foi varrido a 2026-11-18 e não tem segredos.

_Rejeitado:_ a ação oficial do gitleaks, que é um intermediário a mais; um hook local antes de cada commit, que obriga a instalar o gitleaks em cada máquina (a proteção de push do GitHub já trava os segredos conhecidos).

### 6. Exceções do gitleaks

Marcar um segredo como falso alarme é uma exceção a um check. Só acontece com autorização do dono, e o relatório do PR mostra-a. O detetor de exceções ganha o tipo `segredo-ignorado`, com o nome "Segredo marcado como falso alarme (gitleaks)". Conta como exceção:

- uma linha acrescentada com `gitleaks:allow`, em qualquer ficheiro;
- cada linha acrescentada ao `.gitleaksignore`;
- uma mudança ao `.gitleaks.toml`, contada uma vez por ficheiro, como o `app-sizes.json`.

### 7. Template de PR

O ficheiro `.github/pull_request_template.md` tem exatamente o conteúdo da secção 3 do ADR-004, sem comentários HTML.

### 8. CodeRabbit

- **Instalação:** o dono instala a app, só neste repositório, porque pede o login dele no GitHub. É grátis em repositórios públicos.
- **Configuração** (`.coderabbit.yaml`):
  - comentários em `pt-PT`, com o perfil `chill`;
  - sem aprovações automáticas, porque o merge do dono é a aprovação;
  - sem poema e sem mensagens de espera;
  - não revê ficheiros gerados: `pnpm-lock.yaml`, `**/*.gen.ts`, `**/openapi.json` e o cliente gerado;
  - lê como regras o `CLAUDE.md`, que lê por defeito, o `CONTRIBUTING.md` e os ADRs;
  - instruções por caminho com as regras que mais custam se falharem: `organizacao_id` e RLS em todas as tabelas de organização, acesso só por `withOrganizacao`, a organização nunca vem do cliente, logs sem dados pessoais (ADR-006), sem dados reais nem segredos, e a convenção de nomes.
- **Não é um check obrigatório:** se o serviço falhar ou atingir o limite, bloquearia todos os PRs. As conversas que abre têm de ser resolvidas, como as do `/code-review`.

### 9. Ordem e provas

O ruleset aplica-se antes do merge do PR deste ticket, e o próprio PR é o primeiro a passar pelas regras. Aplicar o ruleset muda as definições do repositório: pede-se confirmação ao dono nesse momento.

Provas, registadas no PR:

1. Um push direto para o `main` é recusado.
2. Um PR com um check vermelho fica bloqueado. Usa-se o PR deste ticket com um commit temporário que parte o `lint-tipos`, revertido a seguir.
3. Um PR com uma conversa por resolver fica bloqueado.
4. O job `segredos` falha com um segredo falso. A prova faz-se num PR à parte, que se fecha sem merge e cujo branch se apaga: o job varre todos os commits do PR, por isso um revert não o voltaria a pôr verde. O segredo nunca é real.
5. O CodeRabbit comenta no PR deste ticket.

O estado de "bloqueado" lê-se no campo `mergeStateStatus` do PR (`BLOCKED`).

### 10. Documentação

- `CONTRIBUTING.md`:
  - o `segredos` entra na tabela dos checks;
  - os 9 checks passam a obrigatórios;
  - é preciso atualizar o branch antes do merge;
  - o bypass serve só para emergências, com justificação escrita no PR;
  - como reaplicar o ruleset;
  - o `segredo-ignorado` entra na lista das exceções do relatório.
- ADR-004, tabela de transição: as linhas "CI", "Ruleset", "CodeRabbit" e "Template de PR" passam a "em vigor desde o #24". A decisão não muda.

## O que fica para quem implementa

- Os comandos exatos do `gh api` para criar e atualizar o ruleset (`POST` na primeira vez, `PUT` pelo id depois).
- O texto exato das instruções do CodeRabbit, dentro do que a decisão 8 diz.
- Se a imagem do gitleaks precisar de `safe.directory` ou de `--user` para ler o repositório montado.
