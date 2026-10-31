# ADR-005: Estratégia de testes

- **Estado:** Proposto
- **Data:** 2026-10-31
- **Ticket:** [#22](https://github.com/RafaelFerraz2002/senior-care-platform/issues/22) (épico [#1](https://github.com/RafaelFerraz2002/senior-care-platform/issues/1))
- **Requisitos:** —

## Contexto

O código vai ser escrito sobretudo pelo Claude, e quem faz o merge não lê todas as linhas. Para fazer o merge com confiança, é preciso saber que o PR respeita a arquitetura, que o código é bom, que o RGPD é cumprido, que a segurança se mantém e que tem os testes necessários. Este ADR diz **o que se testa, como e quando**, e o que cada PR tem de trazer.

As ferramentas já estão escolhidas no ADR-001 (escolha da stack): **Vitest**, **Testcontainers** (Postgres real), **Testing Library** e **Playwright**. Os ADRs 002 (multi-organização), 003 (autenticação) e 006 (RGPD e segurança) já definem testes obrigatórios e remetem para aqui o sítio onde vivem e como correm. O ADR-004 (processo) exige checks do CI obrigatórios e que correm sempre, e diz que o tipo de teste exigido na definição de pronto se decide aqui.

### Critérios de decisão

| Critério | O que sabemos |
|---|---|
| Quem escreve | Sobretudo o Claude. O risco típico são testes que passam sempre: testam as próprias simulações e não o sistema. |
| Onde estão os riscos | No isolamento entre organizações, nas permissões, na auditoria e na fila offline do Registo Diário. Vivem na base de dados e na API, não na lógica pura. |
| Dispositivos | Tablets partilhados, muitos deles iPads (Safari/WebKit), e a Gestão em qualquer navegador (ADR-001, ADR-003). |
| Escala | Um lar grande tem cerca de 100 utentes, 50 funcionários e alguns tablets. O risco de performance são os anos de dados acumulados e o peso no tablet, não a concorrência. |
| Tempo de CI | O Claude espera pelo CI antes de dar um PR como pronto: um CI lento atrasa cada correção. O GitHub Actions é grátis enquanto o repositório for público; quando passar a privado, o plano grátis dá 2000 minutos por mês. |
| Dados | Nunca dados reais, nem anonimizados à mão (ADR-006). |

## Opções consideradas

### Onde fica o grosso dos testes

| Opção | Prós | Contras |
|---|---|---|
| **A. Integração com Postgres real no centro; unitários para a lógica pura; ponta a ponta nos fluxos críticos e um caminho feliz por módulo** ✅ | Testa onde estão os riscos (RLS, permissões, transações). Rápido o suficiente para cada PR. | Os testes de integração são mais lentos do que os unitários; precisa de Docker no CI. |
| B. Pirâmide clássica: muitos unitários com a base simulada | Muito rápido. | A base simulada não tem RLS: os testes passam e a fuga de dados chega à produção. |
| C. Playwright em todos os ecrãs | Cobre toda a interface. | Com cerca de 20 módulos, centenas de testes e CI de 30 a 60 minutos. Testes instáveis levam a ignorar o vermelho. Cada mudança de ecrã parte vários testes. |

### Cobertura

| Opção | Prós | Contras |
|---|---|---|
| **A. Mínimo de 80% nas linhas alteradas em cada PR** ✅ | Cada mudança traz testes. Não pune o código antigo nem incentiva testes inúteis. | Precisa de uma ferramenta que compare com o `main`. |
| B. Meta global (por exemplo, 80% do projeto) | Simples. | Incentiva testes só para subir o número; uma descida pequena num módulo crítico passa despercebida. |
| C. Não medir | Zero esforço. | Módulos inteiros sem testes passam sem ninguém reparar. |

### Performance

| Opção | Prós | Contras |
|---|---|---|
| **A. Limites determinísticos em cada PR (tamanho das apps, complexidade); teste de carga antes do piloto e de versões grandes; consultas lentas monitorizadas em produção** ✅ | Sem alarmes falsos; apanha o que interessa à nossa escala. | Uma regressão de tempo pode só aparecer no teste de carga seguinte ou em produção. |
| B. Testes de tempo em cada PR | Deteção imediata. | Os servidores do CI são partilhados e os tempos variam muito: alarmes falsos. |
| C. Nada | Zero esforço. | Listas e relatórios lentos só se descobrem com a cliente a usar. |

## Decisão

**O grosso dos testes é de integração, com Postgres real; Playwright nos fluxos críticos em profundidade e num caminho feliz por módulo; 80% de cobertura nas linhas alteradas; CI de cada PR em 10 minutos no máximo, com uma execução noturna para o que é lento.** O detalhe segue abaixo.

*Os nomes de pastas, scripts e jobs são ilustrativos. A estrutura concreta decide-se no [#17](https://github.com/RafaelFerraz2002/senior-care-platform/issues/17) (scaffolding) e o CI no [#18](https://github.com/RafaelFerraz2002/senior-care-platform/issues/18). O ruleset com os checks obrigatórios é do [#24](https://github.com/RafaelFerraz2002/senior-care-platform/issues/24) (ADR-004).*

### 1. Como se verifica cada coisa

| O que se quer saber | Verificação automática (CI) | Revisão |
|---|---|---|
| Arquitetura respeitada | Testes que fazem cumprir os ADRs: catálogo e papéis (ADR-002), regras de importação entre módulos com o eslint-plugin-boundaries (ADR-001: um módulo da API não importa o interior de outro; as apps não importam a API, só o `api-client`). | Agente `revisor-adr` contra os ADRs aceites (previsto no `CLAUDE.md`, depois do #17). |
| Bom código | TypeScript em modo estrito, ESLint (com limite de complexidade por função), Prettier. | CodeRabbit e Claude (ADR-004). |
| RGPD cumprido | Testes obrigatórios do ADR-006; seeds só fictícios; `gitleaks`. | Revisor: sem dados reais nem segredos. |
| Segurança | Testes obrigatórios dos ADRs 002, 003 e 006. Secret scanning e alertas de dependências no GitHub. | Revisor. |
| Testes necessários | Regras por tipo de mudança (secção 3) e cobertura das linhas alteradas (secção 4). | Revisor: os casos certos estão lá? |

A regra que vive num teste não depende de ninguém se lembrar dela. Sempre que possível, uma regra de um ADR passa a ser um teste.

### 2. Níveis de teste

1. **Unitários (Vitest):** lógica pura, sem base de dados nem rede. Regras de negócio, cálculos, prazos, validações (schemas Zod de `packages/shared`), o bloqueio do PIN.
2. **Integração da API (Vitest + Testcontainers):** cada endpoint chamado por HTTP contra um Postgres real, com as migrações aplicadas, ligado com o **papel app** e o RLS ativo, dentro do `comOrganizacao` (ADR-002). **É aqui que fica a maior parte dos testes.** Os testes obrigatórios dos ADRs 002, 003 e 006 são quase todos deste nível.
3. **Componentes (Testing Library):** só componentes com lógica, como formulários com validação, o estado da fila offline e os avisos de saída de dados. Componentes só visuais do `packages/ui` não têm teste próprio.
4. **Ponta a ponta (Playwright)**, com a API, as apps e o Postgres a correr como em produção (contentores):
   - **Fluxos críticos, em profundidade**, com os casos de erro:
     - entrada na Gestão com verificação em dois passos;
     - registo de um tablet e entrada com PIN, incluindo o bloqueio;
     - registo de uma atividade no Registo Diário, também com a rede cortada a meio, para verificar a fila e o reenvio;
     - uma pessoa da organização A não consegue ver nada da B pela interface.
   - **Um caminho feliz por módulo:** o ecrã principal abre, cria-se ou edita-se algo, e o resultado aparece. Apanha a "fiação partida" (um botão que deixou de chamar a API) em todo o lado.
   - **Acessibilidade:** os mesmos testes correm o axe (contraste, etiquetas, foco) e falham em erros graves.
   - O Registo Diário testa-se com emulação de tablet (iPad, em WebKit). A emulação não é o Safari de um iPad (PWA instalada, service worker, armazenamento apagado pelo Safari), por isso há também uma verificação manual num iPad real (secção 6).

### 3. O que cada PR tem de trazer

| Mudança | Teste exigido |
|---|---|
| Correção de um bug | Um teste que reproduz o bug e falha antes da correção. |
| Endpoint novo ou alterado | Integração com três casos: o normal; sem permissão (recusado); outra organização (não vê, não altera, 0 linhas). |
| Regra de negócio | Unitários, incluindo os limites (zero, máximo, datas na fronteira). |
| Tabela, vista ou função nova | O teste de catálogo do ADR-002 apanha-a sozinho. Acrescenta-se ao gerador de dados fictícios (secção 5). |
| Secção sensível nova (saúde, documentos…) | O teste de consulta sensível do ADR-006 passa a cobri-la. |
| Ecrã ou módulo novo | O caminho feliz Playwright desse módulo. |
| Fluxo crítico alterado | O teste ponta a ponta desse fluxo, atualizado. |
| Só documentação ou configuração sem código | n/a (ADR-004). |

**Como se escrevem:**
- Nas regras de negócio e nas correções de bugs, **o teste escreve-se primeiro** e vê-se falhar antes de escrever o código.
- **Nos testes de integração e ponta a ponta não se simula a base de dados nem a nossa API.** Os serviços externos usam substitutos locais: Mailpit (email) e MinIO (S3), como no `docker compose` (ADR-001). Só se simula o que não tem substituto local (por exemplo, o Web Push), e apenas na fronteira.
- Cada teste cria os seus dados e não depende da ordem nem do resultado de outro.
- **Tempo controlado:** a API tem um **relógio injetável**, e os testes avançam-no em vez de esperar. Todos os prazos de negócio e de segurança (as 14 horas da chave de registo, os bloqueios, a validade dos convites, os prazos de conservação) calculam-se com o instante dado por esse relógio e passado às consultas. O `now()` do Postgres só se usa em colunas de registo, como a data de criação, e nunca para decidir se algo expirou. É o "relógio do servidor" do ADR-003.

### 4. Cobertura

- Vitest com cobertura (v8) nos testes unitários, de componentes e de integração.
- **Onde se aplica a regra dos 80%:** `apps/api`, `packages/shared` e a lógica das apps (hooks, estado, a fila offline do Registo Diário). As páginas, as rotas e os componentes só visuais ficam fora da conta: são cobertos pelo caminho feliz do Playwright, e exigir-lhes cobertura obrigava a escrever testes de componente inúteis.
- **Regra: pelo menos 80% das linhas alteradas no PR cobertas.** O CI compara com o `main` e o check falha abaixo disso. O valor global aparece no PR, só como informação.
- Ficam também de fora da conta: código gerado (`packages/api-client`), migrações e ficheiros de configuração.
- **Os testes obrigatórios de segurança e RGPD não contam pela percentagem:** têm de existir. O teste de catálogo e uma lista de testes obrigatórios verificam-no.

### 5. Dados de teste

- **Um único gerador de dados fictícios**, num pacote partilhado, usado pelos testes e pelos seeds realistas do staging (ADR-006). Nomes, moradas, rotinas, medicação e ocorrências plausíveis, em português de Portugal, com uma **semente fixa**, para que os dados sejam sempre os mesmos e uma falha se possa repetir.
- **Sempre duas organizações, A e B**, com locais, pessoas e utentes, nos testes de integração e ponta a ponta. "A B não vê nada" é sempre testável.
- **Base fictícia grande** (por exemplo, 50 organizações × 100 utentes × 3 anos de registos), gerada pelo mesmo gerador, para o teste de carga (secção 7).
- **Nunca dados reais**, nem cópias do MySenior, nem dados "anonimizados à mão".

### 6. Onde vivem e como correm

- **Unitários e de componentes:** ao lado do código, `*.test.ts(x)`.
- **Integração da API:** `apps/api/test/`. Um Postgres por execução (Testcontainers), com **isolamento por base**: cada ficheiro de testes recebe uma base nova, clonada de uma base modelo já migrada. *Rejeitado:* isolamento por transação (abrir uma transação por teste e desfazê-la no fim). O contexto da organização (`set_config`, ADR-002) duraria até ao fim do teste, o que invalida os testes de pool e de "sem contexto, 0 linhas". Também não serve para testes que precisam de commits reais, como o bloqueio do PIN que sobrevive a um reinício da API (ADR-003).
- **Ponta a ponta:** um pacote próprio, `e2e/`.

**CI de cada PR (no máximo 10 minutos):**
- Checks com nome, **todos obrigatórios** (ADR-004): `lint-tipos`, `unitarios`, `integracao`, `seguranca` (testes obrigatórios dos ADRs 002, 003 e 006), `cobertura`, `e2e` e `tamanho-apps`.
- O Turborepo corre só o que mudou. Como manda o ADR-004, um check nunca é filtrado no gatilho: se não houver nada a correr, reporta sucesso.
- `e2e` em cada PR: os fluxos críticos e o caminho feliz dos módulos que mudaram, em **Chromium e WebKit**.

**Execução noturna** (workflow agendado sobre o `main`):
- Só corre se o `main` mudou desde a última execução, exceto a verificação de dependências, que corre todas as noites.
- Corre os testes ponta a ponta completos (todos os módulos) nos **três browsers**, Chromium, Firefox e WebKit, e verifica as dependências vulneráveis.
- Quando falha, abre ou atualiza automaticamente um issue com a etiqueta `noturno` e o link para o erro. Corrige-se antes de começar trabalho novo; uma falha de segurança ou isolamento tem prioridade máxima.
- Não tem nada a ver com as "rotinas noturnas" do Claude no `CLAUDE.md`: aqui é só o CI a correr testes.

**Verificação manual num iPad real** (antes do piloto e antes de cada versão grande), com uma checklist curta guardada no repositório:
- instalar o Registo Diário no ecrã inicial e registar o tablet dentro da app instalada (ADR-003);
- entrar com PIN, registar uma atividade, cortar o Wi-Fi, registar outra, voltar a ligar e confirmar que as duas chegaram;
- fechar a app com registos na fila e confirmar o envio ao reabrir;
- apagar os dados do site no Safari e confirmar que o tablet pede novo registo sem perder o que já tinha sido enviado.

**Testes instáveis:**
- Um teste que falha ao acaso sai para **quarentena** com um ticket, por no máximo 7 dias, e corrige-se ou apaga-se.
- Não se carrega em "repetir até passar".
- **Um teste de segurança ou isolamento nunca vai para quarentena:** corrige-se no momento.

**Exceções a um check determinístico** (tamanho das apps acima do limite, linha que não dá para testar):
- A exceção fica num ficheiro do próprio PR (o valor de referência atualizado, ou um `v8 ignore` com o motivo na mesma linha), sempre com o motivo escrito.
- O CI comenta no PR a lista de exceções desse PR, bem à vista.
- **O Claude nunca cria uma exceção por iniciativa própria:** pergunta primeiro ao responsável na conversa, com o motivo. A autorização é o merge, que só o responsável faz (ADR-004).
- Não dá para impor isto tecnicamente, porque o GitHub vê o responsável e o Claude como a mesma conta. A proteção está na regra, na visibilidade e na revisão.
- Os testes obrigatórios de segurança e RGPD não admitem exceção.

### 7. Performance

| O quê | Quando | Limite inicial |
|---|---|---|
| Tamanho do JavaScript de cada app | Cada PR (`tamanho-apps`) | Fixado no #17 com o tamanho inicial; uma subida acima de 10% num PR falha e tem de ser justificada. |
| Complexidade das funções | Cada PR (lint) | Limite de complexidade do ESLint, fixado no #17. |
| Teste de carga com **k6** num ambiente temporário no Scaleway, igual à produção, com a base fictícia grande, criado para o teste e apagado a seguir. O staging grátis (Neon, API que adormece) não serve: não cabe a base e os tempos nada diriam sobre a produção | Antes do piloto real e antes de cada versão grande | 95% dos pedidos em menos de 300 ms; registar uma atividade com resposta em menos de 1 s. |
| Consultas lentas em produção (`pg_stat_statements`), com alerta | Sempre | A definir quando a produção estiver montada. |

*Rejeitado:* testes de tempo em cada PR, pelos alarmes falsos dos servidores partilhados do CI.

## Consequências

**Positivas**
- O merge assenta em verificações com nome: sabe-se o que passou, e não só que passou.
- Os testes estão onde estão os riscos: a base de dados, o RLS e as permissões.
- As regras dos ADRs passam a testes, por isso não dependem da memória de ninguém.
- Testes escritos por IA não podem esconder-se atrás de simulações da base de dados.
- O mesmo gerador serve os testes, o staging e o teste de carga.

**Negativas e riscos**

| Risco | Mitigação |
|---|---|
| O CI passar dos 10 minutos com o crescimento dos módulos | Turborepo; testes de integração em paralelo; mais testes passam para a execução noturna; rever a divisão quando o tempo passar dos 10 minutos. |
| Testes de integração lentos por arrancarem um Postgres | Um contentor por execução e não por teste; clonar a base modelo é rápido. |
| Testes ponta a ponta instáveis | Quarentena com prazo; esperar por estados da página e não por tempos fixos; poucos testes, mas bem escolhidos. |
| 80% das linhas alteradas atingido com testes fracos | O revisor verifica os casos (normal, sem permissão, outra organização); os testes obrigatórios não dependem da percentagem. |
| Um ecrã fora do caminho feliz partir sem ninguém dar por isso | O caminho feliz cobre o ecrã principal de cada módulo; o resto fica coberto pela integração e pelo `api-client` gerado (uma app desalinhada da API não compila). |
| Minutos de CI quando o repositório passar a privado | Cerca de 1200 minutos por mês previstos face aos 2000 grátis; a execução noturna só corre quando há mudanças. |

**Decisões que ficam para outros ADRs e tickets**
- [#17](https://github.com/RafaelFerraz2002/senior-care-platform/issues/17) (scaffolding): nomes das pastas e scripts, configuração do eslint-plugin-boundaries, relógio injetável, limites de complexidade e de tamanho das apps, gerador de dados fictícios.
- [#18](https://github.com/RafaelFerraz2002/senior-care-platform/issues/18) (CI): os jobs com nome, a cobertura das linhas alteradas, a execução noturna e o issue automático.
- [#24](https://github.com/RafaelFerraz2002/senior-care-platform/issues/24) (proteção do `main`): o ruleset com os checks obrigatórios e o `gitleaks` (ADR-006).
- [#19](https://github.com/RafaelFerraz2002/senior-care-platform/issues/19) (ambientes): os seeds realistas no staging, a partir do mesmo gerador.
- Ticket próprio, antes do piloto: o teste de carga com k6 e a base fictícia grande.
