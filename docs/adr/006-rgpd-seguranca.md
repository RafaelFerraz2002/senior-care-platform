# ADR-006: Proteção de dados, RGPD e segurança

- **Estado:** Aceite
- **Data:** 2026-10-30
- **Ticket:** [#23](https://github.com/RafaelFerraz2002/senior-care-platform/issues/23) (épico [#1](https://github.com/RafaelFerraz2002/senior-care-platform/issues/1))
- **Requisitos:** GL-12 (registo da navegação), AD-06 (auditoria de entradas), AD-07 (auditoria de Fichas de Acompanhamento), AD-08 (exportações de dados), RD-13 (Ficha de Acompanhamento auditada)

## Contexto

A plataforma guarda dados de saúde e do dia a dia de idosos: medicação, feridas, quedas, ocorrências, fotografias e documentos. São uma **categoria especial** no RGPD (art. 9.º), e os titulares são pessoas vulneráveis. Cada organização é a **responsável pelo tratamento**; a plataforma é **subcontratante** (ADR-002, multi-organização).

Este ADR junta as regras de proteção de dados e de segurança que têm de existir **antes do primeiro dado real**, e fecha o que os ADRs anteriores deixaram em aberto:
- ADR-001 (escolha da stack): fornecedor de produção na UE, backups e regras do Sentry.
- ADR-002 (multi-organização): acesso de emergência à produção, e exportação e eliminação de uma organização no fim do contrato.
- ADR-003 (autenticação): conservação do histórico de segurança e dos endereços de rede, fotografias da equipa e recuperação do único administrador.

O que o MySenior já faz e serve de ponto de partida: auditoria de entradas com IP e porta (AD-06), registo de cada mudança de ecrã (GL-12), Ficha de Acompanhamento gerada com aviso e auditada (RD-13, AD-07) e exportações a pedido (AD-08).

*Este ADR não é aconselhamento jurídico.* Diz o que a plataforma faz e o que precisa que exista do lado de cada organização. Os factos sobre fornecedores e legislação foram verificados a 2026-10-30; o que não se conseguiu confirmar está marcado.

### Critérios de decisão

| Critério | O que sabemos |
|---|---|
| Pior cenário | Uma fuga de dados de saúde de idosos: de uma organização para outra (coberto pelo ADR-002) ou para fora da plataforma. |
| Equipa | Uma pessoa a desenvolver e a operar. Tudo o que depende de disciplina manual tem de ser automático ou verificado pelo CI. |
| Repositório | **Público**. Nada que seja dado real, segredo ou registo de incidentes pode lá entrar. |
| Orçamento de produção | Cerca de 20–25 €/mês. |
| Primeira cliente | A Coophousing está disponível para testar a app. Não se sabe como trata hoje o RGPD com o MySenior, e ninguém do lado deles vai ler este ADR: o que lhes é pedido tem de ser uma lista prática (secção 12). |
| Prazos legais | Não foi encontrado um prazo legal de conservação para o processo do utente num lar (Portaria 67/2012 não confirmada), nem um prazo da CNPD para logs ou IPs. Na falta de prazo, conserva-se o necessário para a finalidade (Lei 58/2019, art. 21.º). Só a faturação tem prazo fixo: 10 anos (CIVA, art. 52.º). |

## Opções consideradas

### Onde podem entrar dados reais

| Opção | Prós | Contras |
|---|---|---|
| **A. Só em produção; staging só com dados fictícios e realistas** ✅ | Uma só fronteira, fácil de verificar. O staging grátis do ADR-001 continua a servir. | A Coophousing só testa com dados reais quando a produção estiver montada. |
| B. Dados reais no staging, num piloto | Feedback real mais cedo. | Planos grátis sem garantias nem backups, e sem DPA. Para o RGPD, esse staging passava a ser produção. |
| C. Importar uma exportação do MySenior para testar | Volumes e casos reais. | São dados reais fora da produção: a opção B por outro caminho. |

### Fornecedor de produção

| Opção | Prós | Contras |
|---|---|---|
| **A. Scaleway (Paris): PostgreSQL gerido + VM para a API + Object Storage** ✅ | Empresa francesa. Postgres gerido com backups diários (7 dias, configurável), encriptação em repouso disponível, DPA no contrato, S3 na UE. DB-DEV-S a cerca de 11 €/mês. | A encriptação em repouso tem de ser ativada por nós. Recuperação para um ponto no tempo (PITR) **não confirmada**. Os backups lógicos não vêm encriptados. |
| B. Hetzner com o Postgres instalado na VPS | Barato, empresa alemã. | Os planos CX baratos estão impossíveis de encomendar desde junho de 2026 (o CPX22 custa 19,49 €). Sem Postgres gerido: backups, encriptação (LUKS) e atualizações ficavam a nosso cargo. |
| C. OVHcloud | Empresa francesa, DPA para todos os clientes. | O plano Essential guarda só 2 dias de backups. Preço e encriptação em repouso do Postgres gerido não confirmados. |
| D. Render ou Neon (Frankfurt), Supabase, AWS, Google, Azure | Mais simples de operar; o Neon já é o staging. | Empresas dos EUA, sujeitas ao CLOUD Act mesmo com os dados na UE. |

### Encriptação dos dados de saúde

| Opção | Prós | Contras |
|---|---|---|
| **A. TLS em trânsito + encriptação de disco e do armazenamento do fornecedor** ✅ | Transparente para a aplicação; pesquisa e relatórios funcionam normalmente. | Quem tiver acesso à base com credenciais lê os dados. Coberto pelo RLS, pelos perfis e pelo acesso de emergência controlado. |
| B. Encriptação campo a campo na aplicação | Uma cópia da base sem a chave é ilegível. | Parte a pesquisa, os filtros e os relatórios; obriga a gerir e rodar chaves dentro da app. Desproporcionado para uma pessoa a operar. |

### O que a auditoria regista

| Opção | Prós | Contras |
|---|---|---|
| **A. Alterações, consultas sensíveis, saídas de dados e acessos da plataforma** ✅ | Responde a "quem abriu a saúde desta utente?". Volume controlado. | Cada ecrã sensível tem de registar a abertura de forma explícita (verificado por testes). |
| B. Cada pedido ou cada ecrã, como o GL-12 | Não falha nada. | Volume enorme e ruído; o registo passa a ser ele próprio um ficheiro sensível. |
| C. Só alterações | Simples. | Não diz quem viu. |

## Decisão

**Dados reais só em produção, num fornecedor com sede na UE (Scaleway), com encriptação em trânsito e em repouso, backups com reposição testada todos os meses, auditoria de alterações, consultas sensíveis e saídas de dados, e nada apagado automaticamente sem decisão da organização.** O detalhe segue abaixo.

*Os nomes de tabelas, funções e papéis são ilustrativos. A convenção de nomes decide-se no [#17](https://github.com/RafaelFerraz2002/senior-care-platform/issues/17). Os prazos são os iniciais e podem ajustar-se.*

### 1. Ambientes e dados reais

- **Dados reais só em produção.** Qualquer ambiente com dados de uma pessoa real é produção para o RGPD, chame-se como se chamar.
- **Local, CI e staging: só dados fictícios.** Os seeds são **realistas** (nomes portugueses, rotinas, medicação, ocorrências e volumes parecidos com os de um lar), gerados a partir da estrutura levantada no MySenior, nunca copiados de lá. A Coophousing testa os fluxos no staging com estes dados.
- **Piloto real:** um local, poucos utentes, de preferência só o Registo Diário, em paralelo com o MySenior, que continua a ser o registo oficial. Só arranca com a checklist de entrada cumprida (secção 13).
- Nunca há dados reais no repositório, em seeds, em testes, em issues, em capturas de ecrã nem em ferramentas de IA.

### 2. Alojamento

- **Regra:** em produção, todos os fornecedores que tocam em dados pessoais têm **sede na UE**, não só uma região na UE. Exceção possível só para serviços que, por desenho, não recebem dados pessoais:
  - a CDN que serve os ficheiros estáticos das apps;
  - o **Sentry** (empresa dos EUA, dados em Frankfurt): não recebe dados pessoais, nem sequer o ID da pessoa (secção 9). Fica na lista de subcontratantes por precaução, porque um erro pode sempre arrastar um dado que escape ao filtro. Se a AIPD da organização não aceitar esta exceção, troca-se por um serviço compatível com o SDK do Sentry alojado por nós na VM (GlitchTip ou Bugsink).
  - O GitHub (CI) nunca recebe dados reais nem credenciais da base de produção (secção 5).
- **Produção:** Scaleway, região Paris.
  - PostgreSQL gerido (DB-DEV-S ou superior), com encriptação em repouso **ativada na criação**.
  - Uma VM pequena para o contentor da API (ADR-001: o pg-boss e o Web Push precisam de um processo sempre ligado). O preço confirma-se ao montar.
  - Object Storage em Paris para fotografias e documentos.
- **Staging:** fica como no ADR-001 (Neon em Frankfurt, Cloudflare Pages), porque só leva dados fictícios.
- *Por confirmar ao montar a produção:* se o Scaleway tem PITR no plano escolhido, e o preço da VM.

### 3. Encriptação

- **Em trânsito:** só HTTPS, com HSTS. A ligação da API ao Postgres exige TLS e verifica o certificado. Os links para ficheiros são HTTPS.
- **Em repouso:** encriptação do Postgres gerido (LUKS do Scaleway) e encriptação do lado do servidor no Object Storage.
- **Backups próprios:** encriptados com uma chave que só nós temos (secção 4).
- **No tablet:** o que o Registo Diário guarda offline segue o ADR-003 (autenticação): o mínimo, por pouco tempo, e apagado com a última chave de registo.

### 4. Backups e reposição

- **Do fornecedor:** backups diários automáticos, 7 dias de retenção. PITR se existir.
- **Cópia própria:** um `pg_dump` diário, encriptado com uma chave nossa, enviado para uma **segunda conta ou outro fornecedor da UE**, com 30 dias de retenção. Protege contra a perda da conta principal e cobre o facto de os backups lógicos do Scaleway não virem encriptados. Os ficheiros do Object Storage entram na mesma cópia.
- **Teste de reposição automático, todos os meses:** decifra a cópia mais recente, repõe-na num Postgres temporário (um contentor na própria VM, sem custo extra), corre verificações (contagens por tabela, testes de catálogo do ADR-002) e apaga tudo. Uma falha avisa o responsável da plataforma.
- **Onde corre:** o `pg_dump` e o teste correm **na VM de produção**, como tarefas agendadas, com o papel dono (ADR-002). **Nunca no CI:** os runners do GitHub são dos EUA e o teste mexe em dados reais.
- **A chave dos backups:** vive nos segredos da VM, porque o dump e o teste correm lá; isso não acrescenta exposição, porque quem tem a VM já tem acesso à base. Há uma segunda cópia no gestor de passwords e outra offline, para conseguir decifrar se a conta do Scaleway se perder.
- **Eliminações depois de uma reposição:** cada eliminação definitiva (de um utente, funcionário ou organização) fica num **registo de eliminações** só com IDs e data, copiado todos os dias para fora da base, junto com a cópia própria. Uma reposição real volta a aplicar as eliminações posteriores ao ponto reposto, antes de reabrir o serviço.
- **Objetivos:** perder no máximo 24 horas de dados (minutos, se houver PITR) e voltar a funcionar em menos de 1 dia útil.

### 5. Acessos

- **Isolamento por organização:** RLS e `comOrganizacao`, como no ADR-002 (multi-organização). A organização vem sempre da sessão, nunca do cliente.
- **Perfis e locais:** como no ADR-003 (autenticação). Aplica-se o princípio da **necessidade de conhecer**: o catálogo de permissões separa ver a ficha de um utente de ver as secções de saúde (medicação, feridas, ocorrências, documentos), por local. O catálogo concreto decide-se no ticket das permissões.
- **Equipa da plataforma:** não vê dados das organizações (ADR-002). A personificação auditada fica para mais tarde.
- **Acesso de emergência à produção** (*break-glass*):
  - no dia a dia, ninguém lê dados. O CI constrói a imagem e manda a VM atualizar; as migrações, os backups e o teste de reposição correm **na VM**, com o papel dono, cujas credenciais só existem nos segredos da VM. **Nenhuma credencial da base de produção está no GitHub;**
  - para uma pessoa, há um login de emergência próprio, membro do papel dono, separado do usado pelas tarefas automáticas. Assim, cada uso humano distingue-se nos logs do Postgres e pode desligar-se sem parar os backups;
  - a password desse login está num gestor de passwords, fora do repositório e do fornecedor;
  - só se usa num incidente grave, com o motivo escrito antes, durante o mínimo de tempo, e troca-se a seguir;
  - cada uso fica no **registo de incidentes, que é privado** (nunca no repositório nem em issues);
  - se forem vistos dados de uma organização, essa organização é avisada.

### 6. Auditoria de dados

Tabela da organização, com RLS, **só de acrescentar**: o papel da app pode inserir e ler, mas não alterar nem apagar. A limpeza por prazo (secção 7) corre por uma função restrita que só apaga linhas mais antigas do que o prazo.

Regista quem (pessoa e app ou tablet), quando, que utente ou funcionário, e:
1. **Alterações:** criar, alterar ou apagar qualquer dado pessoal, com o tipo de registo e **os nomes dos campos** que mudaram. **Nunca os valores**: o registo não pode ser uma cópia dos dados de saúde. Quando um módulo precisar de histórico de valores (por exemplo, a medicação), esse histórico vive no próprio módulo.
2. **Consultas sensíveis:** abrir a ficha de um utente ou uma secção sensível (saúde, medicação, feridas, ocorrências, documentos e fotografias). Uma entrada por abertura, não por pedido. Abrir uma lista que mostra dados de saúde de vários utentes regista "viu a lista X do local Y". No Registo Diário offline, a entrada vai na fila e é enviada com os registos.
3. **Saídas de dados:** PDFs, impressões e exportações, sempre com aviso e motivo, como a Ficha de Acompanhamento do MySenior (RD-13, AD-07, AD-08).
4. **Acessos da plataforma:** uso do acesso de emergência que tenha tocado em dados da organização, personificação (quando existir) e recuperação de administrador (secção 10).

A auditoria guarda o **ID** do utente ou funcionário, nunca o nome. Depois de uma eliminação definitiva, mostra "utente eliminado #id".

**Quem vê:** quem tem a permissão de auditoria (por defeito, os administradores), na Gestão, com filtros por utente, pessoa e período.

O **histórico de segurança** (entradas, PINs, tablets) é a tabela do ADR-003 e segue as mesmas regras de só acrescentar.

*Rejeitado:* replicar o registo de navegação do GL-12. Se um dia houver estatísticas de uso, fazem-se sem dados pessoais.

### 7. Conservação e eliminação

A organização decide quanto tempo guarda os dados dos seus utentes e funcionários; a plataforma dá-lhe as ferramentas e os valores por defeito.

| Dados | Prazo | Como |
|---|---|---|
| Utente que sai ou falece | Decidido pela organização | A ficha fica arquivada, só de leitura. **Nada se apaga automaticamente.** Passado o prazo, contado a partir da data de saída ou de óbito, aparece numa lista de "elegíveis para eliminação" na Gestão; quem elimina é a direção. O prazo é uma definição **por organização**, com 5 anos por defeito. |
| Funcionário que sai | Decidido pela organização | A conta é desativada no próprio dia. Os dados seguem o mesmo mecanismo do utente, contado a partir da data de saída. |
| Histórico de segurança (entradas, IPs, PINs, tablets) | 12 meses | Apagado automaticamente. Valor global da plataforma. |
| Auditoria de dados | 2 anos | Apagada automaticamente. Valor global da plataforma. |
| Faturação da plataforma | 10 anos | Obrigação fiscal (CIVA, art. 52.º). |
| Backups | 7 dias (fornecedor), 30 dias (cópia própria) | O que se apaga continua nos backups até expirarem. Está escrito na informação dada às organizações. |
| Eventos no Sentry | O prazo do plano | Sem dados pessoais (secção 9). |

*Rejeitado:* apagar dados de utentes automaticamente no fim de um prazo. Um prazo mal configurado apagava dados de saúde sem ninguém decidir, e a decisão é da organização.

### 8. Pedidos dos titulares e fim do contrato

Os pedidos chegam à **organização**, não à plataforma. A Gestão dá à direção:
- **Exportar** tudo de um utente ou funcionário: um PDF legível e um ficheiro estruturado (JSON ou CSV), com documentos e fotografias. Fica auditado como saída de dados.
- **Retificar:** a edição normal.
- **Eliminar definitivamente:** com confirmação e auditado. Apaga os dados e os ficheiros; a auditoria mantém só o ID. Fica no registo de eliminações (secção 4).

**O que acontece aos registos ligados a quem é eliminado:**
- **Utente eliminado:** tudo o que é só dele apaga-se. Num registo partilhado com outros utentes (por exemplo, uma ocorrência com dois), sai a parte e a ligação desse utente, e o registo fica para os outros com "utente eliminado". Um ficheiro ligado ao utente eliminado apaga-se, mesmo que esteja ligado a outros (fotografias de grupo); a confirmação mostra a lista antes.
- **Funcionário eliminado:** os registos de cuidados que fez ou assinou continuam nos processos dos utentes, porque a autoria faz parte do registo (ADR-003). Do funcionário fica só o **nome e o ID**, como autor; tudo o resto (contactos, documentos, fotografia, PIN, sessões) apaga-se.

**Fim do contrato de uma organização:**
1. O administrador da organização gera a **exportação completa** na Gestão, em formatos abertos, como as outras exportações (AD-08). A plataforma não lê os dados para isso.
2. Ao fim de 30 dias, ou antes se a organização pedir, a plataforma apaga **tudo** dessa organização, incluindo a auditoria e o histórico de segurança, na base de dados e no Object Storage. Corre por uma função restrita nova (acrescenta-se à lista do ADR-002), que só apaga e não devolve dados.
3. Do lado da plataforma fica só: o ID e o nome da organização, a data, quem pediu e a declaração.
4. Os backups expiram sozinhos em 30 dias, no máximo.
5. A plataforma envia uma declaração de eliminação.

### 9. Logs, Sentry e segredos

- **Logs da API:** só IDs (pedido, organização, pessoa, utente). Nunca nomes, corpos de pedidos, dados de saúde, tokens nem PINs.
- **Sentry**, região UE (Frankfurt), escolhida ao criar a organização no Sentry, em staging e em produção:
  - desligados: IP, cookies, headers, corpos de pedidos e variáveis locais nos stack traces;
  - **sem utilizador:** nenhum ID de pessoa, só o ID do pedido e o da organização (uma pessoa coletiva);
  - `beforeSend` a filtrar o que sobrar;
  - do lado do servidor: scrubbing ligado, sem guardar IPs, e uma regra para remover a geolocalização.
- **Segredos:** só em variáveis de ambiente, diferentes em cada ambiente. `.env` no `.gitignore`.
  - **Agora:** ligar o *secret scanning* com *push protection* do GitHub, grátis para repositórios públicos.
  - **No [#24](https://github.com/RafaelFerraz2002/senior-care-platform/issues/24):** `gitleaks` no CI.

### 10. Fotografias da equipa e recuperação do administrador

- **Fotografias da equipa no ecrã de entrada do tablet** (ADR-003): opcionais, pessoa a pessoa. A própria pessoa pode removê-la. Ficam no Object Storage privado e só aparecem nos tablets dos locais dessa pessoa.
- **Fotografias e documentos em geral:** bucket privado. Abrem-se só por links temporários (poucos minutos) que a API gera depois de verificar a permissão; cada abertura conta como consulta sensível (secção 6).
- **Recuperação do único administrador** (ADR-003):
  1. O pedido chega por escrito, do email registado da organização.
  2. A identidade confirma-se por outro canal: chamada para o contacto oficial da organização.
  3. O responsável da plataforma emite um novo convite de administrador pela função restrita do onboarding (ADR-002, ADR-003).
  4. Fica no registo da plataforma e na auditoria da organização, e a organização recebe um aviso por email.

### 11. Violações de dados

- A plataforma avisa a organização afetada **em até 24 horas** depois de detetar a violação, com o que se sabe nesse momento. A organização tem 72 horas para notificar a CNPD (RGPD, art. 33.º).
- O incidente fica no registo de incidentes privado: o que aconteceu, que dados, que organizações, o que se fez.

**Obrigações da plataforma como subcontratante** (RGPD, art. 28.º e 30.º):
- lista pública de **subcontratantes ulteriores** (Scaleway, Sentry, fornecedor de email…), com aviso às organizações antes de acrescentar um;
- registo de atividades de tratamento como subcontratante, guardado em privado;
- apoio às organizações nos pedidos dos titulares, na AIPD e nas violações.

### 12. Do lado da organização (checklist para a Coophousing)

Antes do piloto real, a organização precisa de ter:
- [ ] **Contrato de subcontratação (DPA)** assinado com a plataforma, com a lista de subcontratantes em anexo.
- [ ] **Encarregado de proteção de dados** nomeado, se for obrigatório para ela (RGPD, art. 37.º: tratamento em grande escala de dados de saúde).
- [ ] **Avaliação de impacto (AIPD)** feita, com o contributo da plataforma. É quase certo que seja exigida: dados de saúde de pessoas vulneráveis, em rede, com tecnologia nova.
- [ ] **Base legal** para tratar os dados de saúde identificada (RGPD, art. 9.º, n.º 2).
- [ ] **Informação aos utentes, às famílias e aos funcionários** atualizada: que dados, para quê, quem trata, por quanto tempo.
- [ ] **Prazos de conservação** fixados (secção 7).
- [ ] **Dois administradores** nomeados na Gestão (ADR-003).

### 13. Checklist de entrada para o primeiro dado real

- [ ] Produção montada no Scaleway, com encriptação em repouso ativa no Postgres e no Object Storage.
- [ ] HTTPS com HSTS, TLS verificado entre a API e o Postgres.
- [ ] Backups do fornecedor ativos e cópia própria encriptada a correr.
- [ ] **Primeiro teste de reposição feito e passado.**
- [ ] Auditoria de dados e histórico de segurança a funcionar nos módulos do piloto.
- [ ] Sentry e logs sem dados pessoais, verificados num erro provocado.
- [ ] Acesso de emergência configurado e registo de incidentes criado.
- [ ] Lista de subcontratantes publicada.
- [ ] Checklist da organização (secção 12) completa.

### 14. Testes obrigatórios

O ADR-005 (estratégia de testes) decide onde vivem e como correm. Têm de existir:
1. **Auditoria só de acrescentar:** o papel da app não consegue alterar nem apagar linhas da auditoria nem do histórico de segurança.
2. **Consultas sensíveis:** abrir cada secção sensível cria exatamente uma entrada na auditoria; abrir uma lista sem dados de saúde não cria nenhuma.
3. **Sem valores na auditoria:** alterar um campo regista o nome do campo e não o valor antigo nem o novo.
4. **Limpeza por prazo:** a função de limpeza apaga só as linhas mais antigas do que o prazo e não toca em dados de utentes.
5. **Eliminação definitiva:** depois de eliminar um utente, não sobra nenhuma linha com dados dele, os ficheiros ligados a ele desaparecem, os registos partilhados ficam para os outros utentes e a auditoria mantém só o ID. Depois de eliminar um funcionário, os registos que assinou continuam, com o nome e o ID dele como autor e nada mais.
6. **Eliminação de uma organização:** a função restrita apaga todas as linhas e ficheiros dessa organização, incluindo a auditoria e o histórico de segurança, e não toca nas outras.
7. **Exportação:** a exportação de um utente inclui os dados de todos os módulos e fica auditada.
8. **Ficheiros:** um link temporário expira, e um pedido de link sem permissão é recusado.
9. **Sem dados pessoais nos logs:** um pedido com dados de saúde não deixa nomes nem valores nos logs (que ficam na VM, só com IDs), e o evento enviado ao Sentry não leva nomes, valores nem IDs de pessoas.

## Consequências

**Positivas**
- Uma fronteira clara: dados reais só em produção, e a produção só abre com uma checklist cumprida.
- Os dados ficam em empresas da UE, encriptados, com backups que se sabe que repõem.
- A direção consegue responder a "quem abriu a saúde desta utente?" sem que a auditoria vire uma segunda cópia dos dados.
- A Coophousing recebe uma lista prática do que tem de tratar do lado dela.
- Fecha o que os ADRs 001, 002 e 003 deixaram em aberto.

**Negativas e riscos**

| Risco | Mitigação |
|---|---|
| Um ecrã sensível novo esquecer-se de registar a consulta | Teste por secção sensível (secção 14). O revisor do PR verifica a lista de secções sensíveis. |
| O Scaleway não ter PITR no plano escolhido | Aceita-se perder até 24 horas; a fila do Registo Diário reenvia o que não chegou. Reavaliar o plano ao montar. |
| Perder a chave dos backups | Duas cópias: gestor de passwords e offline. O teste mensal de reposição usa a chave e deteta a perda cedo. |
| Uma pessoa só a operar o acesso de emergência e os incidentes | Procedimento escrito, credenciais fora do sistema, registo obrigatório. Rever quando entrar mais alguém na equipa. |
| Prazos de conservação definidos por nós, sem prazo legal confirmado | Valores por defeito ajustáveis; a decisão final é da organização (secção 12). Rever se aparecer legislação específica para lares. |
| Lixo de dados reais em ferramentas fora do sistema (capturas de ecrã, emails, IA) | Regra da secção 1 e do `CLAUDE.md`; dados fictícios realistas reduzem a tentação. |
| Custo de produção subir acima de 25 €/mês | Reavaliar o fornecedor mantendo a regra da sede na UE. |

**Decisões que ficam para outros ADRs e tickets**
- ADR-005 ([#22](https://github.com/RafaelFerraz2002/senior-care-platform/issues/22), estratégia de testes): onde e como correm os testes da secção 14.
- [#17](https://github.com/RafaelFerraz2002/senior-care-platform/issues/17) (scaffolding): biblioteca de logs com filtragem e configuração do SDK do Sentry.
- [#19](https://github.com/RafaelFerraz2002/senior-care-platform/issues/19) (ambientes): o staging continua só com dados fictícios; seeds realistas.
- [#24](https://github.com/RafaelFerraz2002/senior-care-platform/issues/24) (CI): `gitleaks`.
- Ticket das permissões: o catálogo que separa a ficha das secções de saúde.
- Ticket próprio, antes do piloto: montar a produção no Scaleway, a cópia própria dos backups e o teste mensal de reposição.
- Mais tarde: personificação auditada para suporte (ADR-002), fornecedor de email e lista de subcontratantes.
