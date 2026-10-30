# ADR-002: Estratégia multi-organização

- **Estado:** Proposto
- **Data:** 2026-10-21
- **Ticket:** [#14](https://github.com/RafaelFerraz2002/senior-care-platform/issues/14) (épico [#1](https://github.com/RafaelFerraz2002/senior-care-platform/issues/1))
- **Requisitos:** GL-01 (código do local no login), AD-02 (dados da organização), AD-05 (dispositivos), AD-09 (chaves de API), AD-10 (faturação por utente ativo), AD-12 (mapa de instituições), GL-07 (novidades do fornecedor), GL-13 (onboarding e subscrição)

## Contexto

A plataforma é SaaS: várias organizações (IPSS, lares, empresas de apoio domiciliário) usam a mesma instalação. No MySenior, o login pede o código do local, o utilizador e a password (GL-01), e cada instituição tem os seus dados (AD-02). É preciso decidir como se isolam os dados de cada organização.

Os dados são sobretudo de saúde de idosos, uma categoria especial no RGPD. Cada organização é a **responsável pelo tratamento** dos dados dos seus utentes e funcionários; a plataforma é subcontratante. Uma organização ver dados de outra é uma violação de dados entre entidades diferentes.

Algumas funcionalidades atravessam organizações por natureza: a faturação conta os utentes ativos de cada cliente (AD-10), o mapa público lista instituições (AD-12), as novidades do fornecedor são iguais para todos (GL-07) e o onboarding cria organizações novas (GL-13).

### Critérios de decisão

| Critério | O que sabemos |
|---|---|
| Risco | O pior que pode acontecer é uma organização ver dados de saúde de outra. O isolamento tem de **falhar fechado**: se o código se esquecer de filtrar, não aparece nada. |
| Unidade de isolamento | A **organização** é o cliente, a entidade que paga. Pode ter um ou mais **locais** (casas, lares). A direção vê todos os locais; cada funcionário vê os locais onde trabalha. |
| Contas | **Uma conta por organização.** Quem trabalha em duas organizações clientes tem duas contas independentes. Não há identidade partilhada entre organizações. |
| Acesso da plataforma | O suporte **não tem acesso** aos dados das organizações. A personificação auditada fica desenhada para mais tarde. |
| Escala | Dezenas de organizações nos primeiros anos, talvez centenas. Ordem de grandeza: uma instituição com 50 utentes gera ~365 mil registos por ano; 100 organizações, ~36 milhões. |
| Orçamento e equipa | Produção a 10–25 €/mês, um programador (ADR-001). |
| Stack | PostgreSQL, Drizzle e NestJS (ADR-001), que já previu RLS com `set_config` por transação. |

## Opções consideradas

### A. Base partilhada, tabelas partilhadas, `organization_id` em cada linha, com Row-Level Security ✅

Todas as organizações vivem nas mesmas tabelas. O Postgres filtra cada consulta pela organização da transação atual, mesmo que o código se esqueça do `WHERE`.

- **Prós:**
  - falha fechada: sem organização definida, não se lê nem se grava nada;
  - uma base de dados e um conjunto de migrações, dentro do orçamento;
  - a faturação e outros totais por organização são consultas simples;
  - permite crescer sem mudar a decisão (ver Consequências).
- **Contras:**
  - o isolamento depende de cada tabela ter a sua política e de a API nunca usar um papel que ignore o RLS;
  - a organização tem de ser definida em cada transação e limpa antes de a ligação voltar à pool.

### B. Um schema do Postgres por organização

Na mesma base, cada organização tem as suas tabelas num namespace próprio.

- **Prós:** exportar ou apagar uma organização inteira é um `DROP SCHEMA`.
- **Contras:**
  - um `search_path` errado numa ligação reutilizada expõe a organização anterior **inteira**, não só uma linha;
  - cada migração corre N vezes, e o drizzle-kit não suporta bem este modelo;
  - o catálogo do Postgres cresce com cada cliente;
  - a faturação e qualquer total entre organizações obrigam a juntar N schemas.

### C. Uma base de dados por organização

- **Prós:** o isolamento mais forte, e um cliente pode ter regras de backup próprias.
- **Contras:**
  - fora do orçamento: cada base gerida custa ~11 €/mês (Scaleway DB-DEV-S, ADR-001);
  - N vezes as migrações, os backups e a monitorização, para um só programador;
  - totais entre organizações exigem ligar a N bases.

### D. Tabelas partilhadas com filtro só no código, sem RLS

- **Prós:** o mais simples de montar.
- **Contras:** um único `WHERE` esquecido expõe dados de saúde de outra organização. Com código gerado em volume com apoio de IA, isso acaba por acontecer. Rejeitada à partida.

### Comparação do risco de fuga de dados

| | Como pode haver fuga | O que fica exposto | Como se deteta |
|---|---|---|---|
| **A** | Tabela ou vista sem política; a API usar o papel dono ou um papel com `BYPASSRLS`; organização não limpa entre pedidos | As linhas da tabela ou vista sem política; tudo, se a API usar o dono | Testes automáticos ao catálogo, aos papéis e à pool (secção 5) |
| **B** | `search_path` errado numa ligação reutilizada | A organização anterior inteira | Difícil: as consultas parecem normais |
| **C** | Ligação à base errada | A organização inteira | Difícil, mas raro |
| **D** | Qualquer `WHERE` esquecido | Todas as organizações, na consulta afetada | Só em review |

## Decisão

**Opção A: tabelas partilhadas com `organization_id` e Row-Level Security.** É a única opção que cabe no orçamento e na operação de uma pessoa e que falha fechada. Os riscos que tem são conhecidos e testam-se automaticamente.

*Os nomes de tabelas, funções e papéis abaixo são ilustrativos. A convenção de nomes decide-se no [#17](https://github.com/RafaelFerraz2002/senior-care-platform/issues/17).*

### 1. Organização e locais

- A **organização** é a unidade de isolamento. O RLS garante que nenhum pedido de uma organização lê ou grava dados de outra.
- O **local** é uma tabela da organização. A restrição "este funcionário só vê o local X" é uma **permissão da aplicação** (guards do NestJS), não RLS.
  - **Porquê:** as permissões por local mudam com os perfis (a direção vê tudo). Um erro aí fica dentro da mesma responsável pelo tratamento. Um erro entre organizações cruza entidades diferentes, e é esse que a base de dados tem de impedir sozinha.
  - *Rejeitado:* RLS também por local. Põe na base de dados regras de perfil que mudam com frequência, e cada política passa a depender das permissões do utilizador.
- **Utilizadores por organização:** o nome de utilizador é único dentro da organização, e a tabela de utilizadores tem RLS como as outras.
  - *Rejeitado:* identidade global com ligações a várias organizações. Seria uma tabela de pessoas fora do isolamento, só para servir um caso raro.

### 2. Tipos de tabelas

| Tipo | Exemplos | Regra |
|---|---|---|
| **Da organização** (quase todas) | locais, utilizadores, sessões, utentes, registos, saúde, tipos de diário, dispositivos (AD-05), chaves de API (AD-09) | `organization_id NOT NULL`, RLS ativo, política da secção 4 |
| **Da plataforma** | organizações, faturação (AD-10), novidades (GL-07), contas da equipa de suporte, listas fixas (distritos, concelhos), tabelas internas do pg-boss | Sem RLS por organização. A API de uma organização não lhes acede, ou só as lê. As exceções são as tabelas do pg-boss (secção 4) e as funções restritas abaixo. |
| **Publicadas** | perfil no mapa de instituições (AD-12) | Só com os campos públicos, preenchida quando a organização opta por aparecer. Para a API da organização é uma tabela da organização: a mesma política de RLS impede que a organização A altere o perfil da B. O mapa lê-a com o papel plataforma, por uma política só de leitura que mostra apenas os perfis visíveis. O mapa nunca lê as outras tabelas da organização. |

- **Não há linhas "globais" com `organization_id` vazio.** Se uma organização pode editar algo (por exemplo, os tipos de diário), recebe uma cópia dos valores por omissão quando é criada.
  - *Rejeitado:* `organization_id NULL` com o significado "vale para todos". Obriga a políticas com `OR organization_id IS NULL`, que são fáceis de errar e abrem leituras entre organizações.
- **O que se lê antes de haver organização:** encontrar a organização pelo código no login (GL-01) e validar uma sessão ou o token de um dispositivo acontecem antes de existir contexto. Fazem-se com **funções restritas** que devolvem só identificadores (organização, utilizador, dispositivo). O resto do pedido corre já dentro do contexto da organização. As tabelas por baixo (utilizadores, sessões, dispositivos) continuam a ser tabelas da organização. O formato da sessão e do token fica para o ADR-003.
- **Funções restritas:** são `SECURITY DEFINER`, pertencem ao papel dono e têm o `search_path` fixo, por isso não ficam sujeitas ao RLS. São poucas e estão listadas, cada uma faz uma só coisa, e são revistas e testadas como fronteiras de segurança. Servem:
  - as leituras antes do contexto (acima);
  - os totais da plataforma (por exemplo, utentes ativos por organização para a faturação);
  - o onboarding (GL-13): criar uma organização e copiar para ela os valores por omissão.

### 3. Chaves e índices

| Decisão | Porquê | Rejeitado |
|---|---|---|
| **UUID v7** como chave primária | Não colide entre bases, por isso mover uma organização para outra base é uma cópia simples. É ordenado no tempo, o que mantém os índices compactos. | **Números sequenciais:** colidem ao juntar ou separar bases e revelam volumes. **UUID v4:** aleatório, fragmenta os índices. |
| **`organization_id` em todas as tabelas da organização**, incluindo as "filhas" (por exemplo, as linhas de um registo) | Cada linha diz de quem é, sem depender de outra tabela. A política é igual em todo o lado e simples de verificar. | Herdar a organização pela tabela-mãe: a política precisaria de um `JOIN`, mais lenta e mais fácil de errar. |
| **Unicidade `(organization_id, id)` e chaves estrangeiras compostas**, por exemplo `(organization_id, utente_id) → utentes(organization_id, id)` | A base de dados recusa que um registo de uma organização aponte para um utente de outra, mesmo com um papel privilegiado. | Chaves estrangeiras só por `id`: permitem referências entre organizações. |
| **Índices a começar por `organization_id`**, e unicidades de negócio por organização (nome de utilizador, nº de processo) | Todas as consultas filtram pela organização. O que é único, é único dentro da organização. | Unicidade global: uma organização descobriria que um valor já existe noutra. |

### 4. Funcionamento em execução

**Papéis do Postgres:**

| Papel | Para quê | Restrições |
|---|---|---|
| **dono** | É o dono das tabelas e das funções restritas; corre as migrações (drizzle-kit), os backups (`pg_dump`) e o acesso de emergência | A API e os workers nunca o usam |
| **app** | A API e os workers em execução | Não é superutilizador, não tem `BYPASSRLS` e não é dono de nenhuma tabela, vista ou função. Só lê e grava dados. |
| **plataforma** | Trabalhos que atravessam organizações (faturação, mapa público, onboarding) | Acede às tabelas da plataforma, à leitura dos perfis publicados e às funções restritas da secção 2. Nunca acede a linhas com dados pessoais. |

O RLS fica **ativo** (`ENABLE ROW LEVEL SECURITY`) em todas as tabelas da organização. **Não se usa `FORCE`.** O dono fica de fora do RLS por ser dono, e precisa de ficar:
- uma migração que corrige dados tem de ver todas as organizações;
- o `pg_dump` falha numa tabela onde o RLS se aplica a quem o corre, o que partiria os backups, a exportação de uma organização e a mudança de um cliente para outra base;
- as funções restritas só conseguem ler fora do RLS porque pertencem ao dono.

A proteção está em a API nunca usar o dono: variáveis de ambiente separadas para a migração e para a execução, e o teste de papéis da secção 5.
- *Rejeitado:* `FORCE` com o dono sujeito ao RLS. As migrações de dados passariam a alterar 0 linhas sem dar erro, e os backups falhariam.
- *Rejeitado:* dar `BYPASSRLS` ao dono e manter o `FORCE`. Tem o mesmo efeito, mas depende de o fornecedor deixar criar papéis com esse atributo.

**A política, igual em todas as tabelas da organização:**

```sql
-- organizacao_atual() = NULLIF(current_setting('app.organization_id', true), '')::uuid
USING      (organization_id = (SELECT organizacao_atual()))
WITH CHECK (organization_id = (SELECT organizacao_atual()))
```

- Sem organização definida, a função dá `NULL`: as leituras devolvem zero linhas, um `INSERT` falha, e um `UPDATE` ou `DELETE` afeta zero linhas **sem dar erro**. Nenhum dado de outra organização é lido nem alterado: **falha fechada**. Para que o `UPDATE` e o `DELETE` não falhem em silêncio, o `comOrganizacao` recusa-se a correr sem organização, e as operações de alteração verificam quantas linhas mudaram (0 linhas é um erro ou um 404, nunca um sucesso).
- O `NULLIF` trata o caso em que uma ligação reutilizada guarda o valor vazio de uma transação anterior; sem ele, a conversão para `uuid` dá erro.
- O `(SELECT …)` faz o Postgres calcular a função uma vez por consulta e não uma vez por linha.

**Como a organização chega a cada consulta:**

1. O guard de autenticação tira a organização **da sessão**, nunca de um cabeçalho, parâmetro ou corpo enviado pelo cliente.
2. Cada pedido corre numa transação que começa com `set_config('app.organization_id', $1, true)`. O `true` limita o valor a essa transação: no commit ou no rollback desaparece, e a ligação volta limpa à pool. Funciona também atrás de um PgBouncer em modo transação.
3. Os módulos só chegam à base de dados por um `comOrganizacao(orgId, tx => …)`. A pool em bruto não é exportada, e o eslint-plugin-boundaries (ADR-001) impede importá-la.

*Rejeitado:* `SET` de sessão. O valor fica agarrado à ligação e passa para o pedido seguinte, que pode ser de outra organização.

**Para lá da base de dados:**

| Peça | Regra |
|---|---|
| **Filas (pg-boss)** | Cada tarefa leva o `organization_id` no payload, e o worker corre-a dentro de `comOrganizacao`. As tabelas do pg-boss são da plataforma e o papel app tem de lhes aceder, por isso **o payload leva só identificadores, nunca dados pessoais**. O schema do pg-boss é criado e atualizado pelo papel dono no deploy, e a API arranca o pg-boss sem migrações automáticas, porque o papel app não altera estrutura. |
| **Ficheiros (S3)** | As chaves seguem `org/<organization_id>/…`. A API só gera um link de download assinado depois de ler os metadados do ficheiro numa tabela com RLS. Nunca aceita uma chave vinda do cliente. |
| **Cache no servidor** | A chave inclui tudo o que muda a resposta: o `organization_id` e o âmbito de acesso de quem pede (o utilizador, ou os locais que pode ver). Uma resposta calculada para a direção nunca serve um funcionário de um só local. |
| **Registo Diário** | Ao sair, limpa-se a cache do TanStack Query, porque o tablet é partilhado. **A fila de envio em IndexedDB não se apaga:** os registos por enviar ficam até chegarem à API, para não se perder um registo numa quebra de rede (ADR-001). A fila não aparece a quem entra a seguir, e cada registo leva o autor e a organização de quando foi criado. Como se envia a fila depois de o autor sair fica para o ADR-003. O dispositivo pertence a uma organização (AD-05) e não pode mudar de organização. |
| **Logs e Sentry** | Levam o `organization_id`, que não é um dado pessoal, para diagnóstico. |

### 5. Acesso da plataforma e testes

**Equipa da plataforma:**
- **Agora:** não tem acesso aos dados das organizações. O backoffice da plataforma (lista de clientes, faturação) usa o papel **plataforma** e só vê totais.
- **Mais tarde, num ticket próprio:** personificação auditada. Uma sessão de suporte numa organização concreta tem prazo e motivo obrigatório. Fica registada numa tabela que a própria organização pode ver, e corre pelo mesmo `comOrganizacao`, por isso continua presa ao RLS.
- **Acesso direto à base de produção** (incidente grave): só com o papel dono, em regime de emergência (*break-glass*) e registado. As regras ficam para o ADR-006.
- *Rejeitado:* um papel de suporte com `BYPASSRLS`. É exatamente a fuga que o RLS existe para impedir.

**Testes obrigatórios no CI**, com Postgres real (Testcontainers, ADR-001). O ADR-005 decide onde vivem e como correm.

1. **Catálogo**, sobre tudo o que o papel app consegue ler, e não só sobre tabelas:
   - **tabelas e partições:** todas têm `organization_id NOT NULL`, RLS ativo e a política, exceto uma lista explícita de tabelas da plataforma (incluindo as do pg-boss). As partições também contam, porque uma partição consultada diretamente usa as suas próprias políticas;
   - **vistas:** todas têm `security_invoker = true`. Sem isto, uma vista corre com os privilégios do dono e ignora o RLS;
   - **vistas materializadas:** o papel app não tem acesso a nenhuma, porque o Postgres não lhes aplica RLS;
   - **funções `SECURITY DEFINER`:** só existem as da lista de funções restritas.

   Uma tabela, vista ou função nova fora destas regras parte o CI.
2. **Papéis:** o papel app não tem `BYPASSRLS`, não é superutilizador e não é dono de nenhuma tabela, vista ou função.
3. **Isolamento:** com duas organizações fictícias A e B, no contexto da A:
   - ler, alterar ou apagar linhas da B afeta 0 linhas;
   - inserir com o `organization_id` da B falha;
   - sem contexto, as leituras devolvem 0 linhas e o `comOrganizacao` recusa-se a correr.
4. **Pool:** com uma pool de uma só ligação, um pedido da A seguido de um da B não deixa o contexto passar de um para o outro.
5. **Chaves compostas:** um registo da A a apontar para um utente da B é recusado.

## Consequências

**Positivas**
- O isolamento é garantido pela base de dados e falha fechado: um `WHERE` esquecido devolve zero linhas, não dados de outra organização.
- Uma base de dados e um conjunto de migrações, dentro do orçamento e da capacidade de um programador.
- A faturação, o mapa público e outros totais por organização são consultas simples, pelo papel plataforma.
- **Escalar não obriga a mudar esta decisão.** Os degraus, por ordem:
  1. servidor maior;
  2. índices por organização e partições nas tabelas grandes (registos, auditoria);
  3. réplicas de leitura para estatísticas e relatórios;
  4. mover um cliente grande para uma base só dele, com o mesmo schema (possível graças ao UUID e ao `organization_id` em todas as linhas);
  5. distribuir por `organization_id` com Citus.
- O caminho inverso (de schemas ou bases por organização para tabelas partilhadas) seria uma migração grande; começar partilhado não nos prende.

**Negativas e riscos**

| Risco | Mitigação |
|---|---|
| Tabela, partição ou vista nova sem RLS | Teste de catálogo. As políticas declaram-se no schema do Drizzle (`pgPolicy`), e o que o Drizzle não gerar vai em SQL na migração. |
| A API ligar-se com o papel dono, que fica de fora do RLS | Variáveis de ambiente separadas para a migração e para a execução, e o teste de papéis. |
| Uma função restrita devolver mais do que devia | Poucas, listadas, cada uma faz uma só coisa, e são testadas. O teste de catálogo recusa funções `SECURITY DEFINER` fora da lista. |
| `UPDATE` ou `DELETE` sem contexto afetar 0 linhas em silêncio | O `comOrganizacao` recusa-se a correr sem organização, e as alterações verificam quantas linhas mudaram. |
| Organização vinda do cliente | Só a sessão a define. Fica como regra de review. |
| Desempenho do RLS | Índices a começar por `organization_id`, a função calculada uma vez por consulta, relatórios em tarefas de fundo. |
| Transações longas (cada pedido é uma transação) | Pedidos curtos; tudo o que é pesado vai para o pg-boss. |
| Um cliente com uma consulta pesada atrasa os outros | Relatórios e PDFs em tarefas de fundo, e um tempo máximo por consulta (`statement_timeout`). |
| Staging no Neon | Criar um papel app separado do papel dono que o Neon cria por omissão. |
| Quem trabalha em duas organizações tem duas contas | Aceite: é um caso raro e mantém o isolamento simples. |

**Decisões que ficam para outros ADRs e tickets**
- ADR-003 ([#15](https://github.com/RafaelFerraz2002/senior-care-platform/issues/15)): a função de procura da organização pelo código, o formato da sessão e do token do dispositivo, e como se envia a fila do Registo Diário depois de o autor sair.
- ADR-005 ([#22](https://github.com/RafaelFerraz2002/senior-care-platform/issues/22)): onde e como correm os testes da secção 5.
- ADR-006 ([#23](https://github.com/RafaelFerraz2002/senior-care-platform/issues/23)): acesso de emergência à produção, e exportação e eliminação de uma organização no fim do contrato.
- [#17](https://github.com/RafaelFerraz2002/senior-care-platform/issues/17) (scaffolding): nomes, o `comOrganizacao`, os papéis no `docker compose` e a primeira migração com o teste de catálogo.
- Personificação auditada para suporte: ticket a criar quando o suporte precisar.
