# ADR-003: Autenticação na Gestão e PIN no Registo Diário

- **Estado:** Proposto
- **Data:** 2026-10-30
- **Ticket:** [#15](https://github.com/RafaelFerraz2002/senior-care-platform/issues/15) (épico [#1](https://github.com/RafaelFerraz2002/senior-care-platform/issues/1))
- **Requisitos:** GL-01 (login com código + utilizador + senha), GL-02 (recuperação de senha), GL-15 (dados de acesso: senha e PIN), RD-02 (entrada no Registo Diário por PIN de 4 dígitos), AD-05 (dispositivos do Registo Diário)

## Contexto

A plataforma tem duas portas de entrada, com pessoas e riscos diferentes:

- **Gestão:** o backoffice usado pela direção, pelos coordenadores e pela parte administrativa. Abre-se em qualquer navegador (PC, telemóvel ou tablet), dentro ou fora da instituição. Uma conta da Gestão vê dados de saúde de muitos utentes.
- **Registo Diário:** usado pelas ajudantes durante o turno, com pressa, para registar o que fizeram com cada utente.

No MySenior, a Gestão pede o código do local, o nome de utilizador e a senha (GL-01), e a senha recupera-se por email (GL-02). O Registo Diário abre com um PIN de 4 dígitos num dispositivo partilhado (RD-02). Os dispositivos registam-se na Gestão lendo um QR code ou escrevendo um código de ativação (AD-05). Cada pessoa pode mudar a senha e gerar um PIN novo nos seus dados (GL-15). Cada entrada no Registo Diário fica registada.

*Nota de nomes:* o "código do local" do MySenior identifica a instituição. Aqui chama-se **código da organização**, porque no ADR-002 (multi-organização) "local" passou a ser uma parte da organização (Centro de Dia, Estrutura Residencial…).

### Critérios de decisão

| Critério | O que sabemos |
|---|---|
| Riscos principais | 1) Um registo perder-se ou não sincronizar. 2) Um registo ficar em nome da pessoa errada (quem deu a medicação, quem viu a queda). 3) Alguém de fora entrar na Gestão com uma senha roubada. |
| Dispositivo do Registo Diário | **Um tablet comum, partilhado pela equipa** e registado na instituição. Costuma estar num local (por exemplo, o Centro de Dia), mas às vezes anda entre locais. Os telemóveis pessoais ficam para mais tarde: o desenho não os impede. |
| Rede | Wi-Fi fiável, com quebras raras (ADR-001, escolha da stack). Mesmo assim, uma quebra não pode impedir a equipa em turno de registar. |
| Quem ajuda | De noite, em regra, não há ninguém com um papel de responsável na instituição. |
| Restrições do ADR-001 (escolha da stack) | NestJS + PostgreSQL, **sem serviço de identidade externo** e sem Redis; Registo Diário como PWA, com a fila de envio em IndexedDB e um ID gerado no cliente. |
| Restrições do ADR-002 (multi-organização) | Uma conta por organização. A organização vem **sempre da sessão**, nunca do cliente. Antes de haver organização só correm **funções restritas** que devolvem identificadores. Os locais são permissões da aplicação. A fila de envio sobrevive à saída de quem a criou. |

## Opções consideradas

### Onde vive a sessão

| Opção | Prós | Contras |
|---|---|---|
| **A. Sessão guardada na base de dados, com um token aleatório num cookie** ✅ | Cancela-se na hora (desativar uma funcionária, "terminar todas as sessões", desativar um tablet). Simples de testar. O token não é legível pelo JavaScript. | Uma leitura à base por pedido (já existe uma transação por pedido, ADR-002). |
| B. JWT assinado, sem estado no servidor | Não lê a base para validar. | Não se cancela antes de expirar, a não ser com uma lista negra, que é uma sessão na base com mais passos. A organização dentro de um token que vive no cliente pede cuidado extra. |
| C. Serviço de identidade (Keycloak, Auth0, Supabase Auth) | Login, 2FA e recuperação prontos. | O ADR-001 (escolha da stack) exclui-o. Nenhum suporta bem o PIN num tablet partilhado com entrada offline. Keycloak é mais um serviço para operar; Auth0 e Supabase põem os dados de identidade fora da nossa base e fora do RLS. |

### Como a pessoa se identifica no tablet

| Opção | Prós | Contras |
|---|---|---|
| **A. Toque no nome (ou fotografia) + PIN** ✅ | O bloqueio por tentativas é por pessoa. Um dígito errado não entra noutra conta. O PIN não precisa de ser único, por isso escolher um PIN não revela o de ninguém. | Um toque a mais. Atenua-se pondo no topo quem já entrou nesse tablet no turno. |
| B. Só o PIN | O mais rápido. | O PIN tem de ser único na organização: 1) com 40 pessoas, um dígito errado pode entrar na conta de uma colega; 2) "este PIN já está em uso" revela o PIN de alguém; 3) sem saber quem está a tentar, o bloqueio tem de bloquear o tablet inteiro. |
| C. Cartão ou NFC | Muito rápido. | Precisa de hardware e o NFC ficou para o épico E11. Um cartão emprestado tem o mesmo problema que um PIN partilhado. |

### Entrar sem internet

| Opção | Prós | Contras |
|---|---|---|
| **A. Só quem entrou online nesse tablet nas últimas 14 horas** ✅ | A equipa em turno continua a registar se a rede cair. O tablet guarda as chaves de registo de poucas pessoas e por poucas horas. | Quem chega de novo durante uma quebra espera pela rede. Uma funcionária desativada ainda entra offline até ao fim da janela. |
| B. Nunca sem internet | O tablet não guarda nada sobre os PINs. | Se a rede falhar, voltam ao papel ou à memória, e os registos perdem-se. |
| C. Toda a equipa, sempre | Ninguém fica de fora. | Para verificar um PIN sozinho, o tablet tem de guardar algo que permite testar os 10 000 PINs possíveis em menos de um segundo. Teria esse "algo" para toda a equipa, a toda a hora, e também para quem já saiu da instituição. |

Em qualquer opção, **uma sessão já aberta continua a registar sem rede**, para a fila (ADR-001, escolha da stack).

### Segundo fator na Gestão

| Opção | Prós | Contras |
|---|---|---|
| **A. Aplicação autenticadora (TOTP), obrigatória para todos** ✅ | Grátis, funciona sem rede no telemóvel, padrão aberto. Uma senha roubada deixa de chegar. | Configuração inicial; perder o telemóvel obriga a um processo de recuperação. |
| B. SMS | Toda a gente sabe usar. | Custa por mensagem, obriga a guardar números pessoais e é o método mais fácil de intercetar. |
| C. Código por email | Sem configuração. | Quem tem a senha do email (muitas vezes a mesma) tem os dois fatores. |
| D. Passkeys (impressão digital ou rosto) | O mais seguro e sem senha. | Ainda confunde muita gente e depende do dispositivo. Fica como **acrescento futuro**, não como alternativa. |
| E. Só para quem tem mais permissões | Menos fricção. | Um coordenador "normal" também vê dados de saúde. A regra fica igual para todos. |

## Decisão

**Sessões guardadas na base de dados; toque no nome + PIN no tablet; entrada offline limitada a 14 horas; verificação em dois passos obrigatória na Gestão.** O detalhe segue abaixo.

*Os nomes de tabelas, funções e papéis são ilustrativos. A convenção de nomes decide-se no [#17](https://github.com/RafaelFerraz2002/senior-care-platform/issues/17). Os valores de tempo e de tentativas são os iniciais e podem ajustar-se com dados de uso.*

### 1. Contas e permissões

- **Uma pessoa, uma conta por organização** (ADR-002, multi-organização). A conta pode ter dois acessos, cada um opcional:
  - **acesso à Gestão:** email, senha e aplicação autenticadora;
  - **acesso ao Registo Diário:** PIN.

  Uma ajudante pode ter só o PIN, sem email. Uma diretora pode ter só a Gestão.
- O **email é único dentro da organização** e é o utilizador da Gestão. *Diferente do MySenior,* que usa um nome de utilizador: o email já é preciso para recuperar a senha, e assim há um dado a menos para decorar.
- O **acesso ao Registo Diário é por local**: a pessoa só aparece e só regista nos locais onde trabalha.
- **Administrador** é um papel próprio, não a soma das permissões. Só ele convida pessoas para a Gestão, atribui permissões e papéis, e repõe a verificação em dois passos de outra pessoa. Quando só existe **um**, a Gestão mostra-lhe um aviso permanente: se perder o acesso, a recuperação depende da equipa da plataforma, por isso deve nomear um segundo.
- **Permissões por local** (ADR-002), atribuídas pelo administrador. As que este ADR usa:
  - **gerir equipa:** criar funcionárias com acesso só ao Registo Diário nesse local, repor o PIN e desbloquear. Só atua sobre pessoas **cujos locais estejam todos dentro dos seus** e que não tenham acesso à Gestão. Assim, um coordenador (ou a conta roubada de um coordenador) nunca mexe na conta de uma diretora nem de um administrador;
  - **gerir tablets:** registar e desativar tablets nesse local.

### 2. Gestão

**Entrada**
1. Código da organização, email e senha. Uma função restrita (secção 4) traduz o código no identificador da organização; tudo o resto corre dentro da organização, com RLS.
2. Código de 6 dígitos da aplicação autenticadora, exceto num dispositivo marcado como "lembrar durante 30 dias".
3. Qualquer erro dá a mesma mensagem, "dados incorretos", sem dizer se o código, o email ou a senha existem.

**Convites e primeira conta**
- A primeira conta (administrador) é criada pela plataforma no onboarding (GL-13, ADR-002).
- As outras são convidadas por email, com um link de uso único válido 72 horas. No primeiro acesso, a pessoa escolhe a senha e ativa a aplicação autenticadora; recebe **10 códigos de recuperação**, mostrados uma vez.

**Senhas**
- Pelo menos 12 caracteres. Sem obrigar a maiúsculas ou símbolos e sem troca periódica forçada: estas regras levam a senhas piores e anotadas em papéis.
- Recusam-se senhas conhecidas de fugas de dados (lista local das mais comuns; a fonte exata decide-se no #17).
- Guardadas com **Argon2id**, um método lento de propósito.

**Esqueci-me da senha (GL-02)**
- Código da organização + email → link por email, de uso único, válido 30 minutos. A resposta no ecrã é sempre a mesma, exista ou não o email.
- Depois de repor, a aplicação autenticadora continua a ser pedida, e todas as sessões abertas dessa conta terminam.

**Perdi o telemóvel**
- Entra-se com um código de recuperação e reconfigura-se a aplicação autenticadora.
- Sem códigos: um **administrador** repõe a verificação em dois passos dessa pessoa, que a configura de novo no próximo acesso. Fica no histórico de segurança.
- **Único administrador sem acesso:** a reposição faz-se com o responsável da plataforma, que confirma a identidade fora do sistema e depois emite um **novo convite de administrador** para essa organização. Usa a mesma função restrita do onboarding (GL-13, ADR-002) que cria o convite do primeiro administrador. Não há função nova, e a plataforma continua sem ver dados da organização. O procedimento de confirmação de identidade fica para o ADR-006 (RGPD e segurança).

**Tentativas erradas**
- Esperas cada vez maiores, por conta e por endereço de rede. **Sem bloqueio definitivo**, para que ninguém consiga bloquear de propósito a conta de outra pessoa.

**Sessões**
- Terminam ao fim de **30 minutos sem uso** e, no máximo, **12 horas** depois de entrar.
- "Terminar sessão em todos os dispositivos" nos dados da pessoa (GL-15). Mudar a senha também termina as outras sessões.
- Email de aviso quando alguém entra na conta a partir de um dispositivo novo.

### 3. Registo Diário

#### 3.1 Registo do tablet (AD-05)

1. Na Gestão, alguém com **gerir tablets** carrega em "Registar tablet", dá-lhe um nome ("Tablet piso 1") e escolhe **um ou mais locais**, um deles principal.
2. Aparece um **QR code** e, ao lado, um **código de ativação** curto para escrever à mão (para tablets sem câmara, como no MySenior). Ambos servem uma única vez e expiram em 10 minutos.
3. No Registo Diário **já instalado** no tablet (ver riscos), lê-se o QR ou escreve-se o código. O tablet recebe uma **chave de dispositivo** própria.
4. Fica registado quem registou o tablet e quando. A Gestão mostra a lista de tablets com a última utilização.

- A senha da Gestão **nunca** é escrita no tablet.
  - *Rejeitado:* registar o tablet entrando com a conta do coordenador no próprio tablet. A senha ficaria exposta num dispositivo partilhado, e a sessão dele podia ficar aberta.
- **O que a chave de dispositivo permite sozinha, sem ninguém com sessão:** ver a lista de nomes e fotografias do ecrã de entrada (dos locais do tablet), enviar a fila e saber se foi desativado. **Nunca** descarrega dados de utentes; isso exige a sessão de uma pessoa (3.5).
- **Desativar tablet** (perdido, roubado, avariado): um clique na Gestão. Com rede, deixa de abrir sessões de imediato. A chave serve depois **uma única vez**, nos 7 dias seguintes, para entregar a fila (ver 3.6) e receber a ordem de apagar tudo; a seguir, ou passado esse prazo, é recusada.
- Um tablet **30 dias sem uso** tem de ser registado de novo.
- **Locais do tablet:** quem entra só vê os utentes dos locais que estão **ao mesmo tempo** no tablet e nas permissões da pessoa. Ninguém ganha acesso a mais por usar outro tablet. Cada local a mais põe mais dados no tablet, por isso escolhem-se só os necessários.
- *Recomendação operacional, fora do código:* prender o tablet na aplicação ("Acesso guiado" no iPad, "Afixação de ecrã" no Android).

#### 3.2 Ecrã de entrada

- Toque no nome ou na fotografia, e depois o PIN.
- A ordem é: primeiro quem entrou nesse tablet no turno; depois a equipa do local principal; o resto encontra-se pesquisando.
- Só aparecem pessoas com acesso ao Registo Diário num dos locais do tablet.

#### 3.3 PIN (RD-02, GL-15)

- **4 dígitos.**
- **Criação:** quem tem **gerir equipa** cria a funcionária na Gestão; o sistema gera um PIN, mostrado uma única vez.
- **Troca obrigatória na primeira entrada.** Enquanto for o PIN gerado, quem o criou também o conhece e poderia registar em nome dela; num registo de cuidados, isso permite contestar a autoria. A troca exige rede.
- Também se pode mudar o PIN nos dados da pessoa, na Gestão, quando tem esse acesso (GL-15).
- **PINs proibidos:** iguais (0000, 1111…), sequências (1234, 4321…) e o PIN anterior.
- Guardado com **Argon2id**. Com rede, **quem verifica é sempre o servidor**.
- **Bloqueio por pessoa:** 5 PINs errados bloqueiam 5 minutos; os bloqueios seguintes duram 15 minutos e depois 1 hora, **sem passar de 1 hora** (de noite não há quem desbloqueie, por isso ninguém fica bloqueada mais do que isso). Um PIN certo repõe a contagem. Quem tem **gerir equipa** pode desbloquear logo.
- **Travão por tablet:** 10 PINs errados no mesmo tablet em 15 minutos, somando todas as pessoas, pausam as entradas **nesse tablet** durante 15 minutos (depois 1 hora). Uso normal não chega lá; serve para quem percorre a lista de nomes a tentar PINs. Fica no histórico de segurança, e quem tem **gerir tablets** pode retomar logo.
  - *Porquê é seguro com 4 dígitos:* com os dois limites, quem tentasse adivinhar durante uma noite inteira teria cerca de uma centena de tentativas em 10 000 combinações, espalhadas por todas as pessoas, e deixava rasto no histórico.
- Os contadores ficam no Postgres, por isso sobrevivem a reinícios da API.
- **Esqueci-me do PIN:** quem tem **gerir equipa** carrega em "Repor PIN" na Gestão, de qualquer sítio (incluindo do telemóvel, fora da instituição). O sistema gera um PIN provisório, mostrado uma vez, com troca obrigatória na entrada seguinte. Fica no histórico de segurança.
  - *Rejeitado:* recuperar o PIN por email ou SMS sem responsável. Muitas ajudantes não têm email profissional, e obrigaria a guardar contactos pessoais. Volta a pensar-se com os telemóveis pessoais.
  - *Rejeitado:* um "PIN de supervisor" no tablet que desbloqueia qualquer conta. Seria o alvo mais valioso do sistema, num dispositivo partilhado.
- **Saída da instituição:** desativar a funcionária na Gestão. Com rede, o PIN deixa de funcionar de imediato.

#### 3.4 Sessão no tablet

- Cada pessoa abre a **sua** sessão com o PIN. Fica presa àquele tablet: não serve noutro dispositivo.
- Termina ao fim de **2 minutos sem toques** e no máximo 12 horas depois de abrir. O botão **Sair** está sempre visível.
- Ao sair, aplica-se a regra do ADR-002 (multi-organização): limpa-se a cache do ecrã, e a fila de envio fica.
- **Chave de registo:** quando uma pessoa entra **com rede**, o servidor gera uma chave secreta só para aquela pessoa, naquele tablet, válida **14 horas** (turnos até 12 horas, mais margem). O servidor guarda uma cópia durante esse tempo.
  - No tablet, a chave fica **cifrada com o PIN** (através de uma função de resumo lenta). Só se usa depois de alguém marcar o PIN certo.
  - **Cada registo é assinado com a chave de registo de quem o fez**, e leva o ID gerado no cliente, o utente, a hora e se foi feito offline.
  - **A autora é a dona da chave que assinou, decidida pelo servidor.** Um nome escrito pelo cliente nunca conta, tal como a organização no ADR-002. Quem tem só a chave do tablet não consegue fazer registos em nome de ninguém.

#### 3.5 Entrar sem internet

1. A chave de registo de 3.4 é também o que permite **entrar sem rede**. Com o tablet offline, a pessoa marca o PIN e o tablet tenta decifrar a chave dela. Se conseguir, o PIN está certo e a sessão abre, marcada como offline.
2. A chave **apaga-se** do tablet:
   - ao fim das 14 horas;
   - ao fim de 5 PINs errados offline para essa pessoa (ela espera pela rede);
   - quando o tablet volta a ligar-se e o servidor diz que a pessoa ou o tablet foram desativados.
3. Quem não tem chave válida nesse tablet espera pela rede.
4. Para se poder trabalhar offline, o tablet guarda também **o mínimo para registar** dos utentes (o que é exatamente decide-se no ticket do Registo Diário).
   - Esses dados descarregam-se **só com a sessão de uma pessoa**, nunca só com a chave do tablet.
   - Cada pessoa descarrega apenas os utentes dos **seus** locais que também são locais do tablet. O tablet guarda a soma do que as pessoas com chave válida podem ver, e mostra a cada uma só os dela.
   - Sem nenhuma chave válida, estes dados apagam-se.

A função de resumo no navegador (PBKDF2 do WebCrypto ou Argon2id em WebAssembly) e o seu custo decidem-se no #17.

*Limite assumido:* quem copiar os dados do tablet consegue descobrir, no computador dele, os PINs que tenham chave naquele momento, testando os 10 000. São poucas pessoas e no máximo 14 horas.

#### 3.6 Envio da fila depois de a autora sair

*Ponto deixado em aberto pelo ADR-002 (multi-organização).*

- A fila é enviada pelo tablet com a **chave de dispositivo**, mesmo sem ninguém com sessão aberta.
- O servidor aceita um registo quando:
  - o tablet está ativo e pertence à organização do registo;
  - a assinatura corresponde a uma chave de registo emitida para aquele tablet;
  - a hora do registo cai **dentro da validade dessa chave** e não está no futuro em relação à hora de chegada (com 5 minutos de tolerância). Um relógio errado no tablet só consegue mexer a hora dentro desta janela;
  - a autora estava ativa a essa hora, e tem hoje permissão no local do utente.
- O que não cumpre estas regras **não se deita fora**: fica **"por confirmar"**, visível na Gestão para quem tem **gerir equipa** naquele local, que o aceita ou rejeita. Fica no histórico quem decidiu.
- Isto inclui a fila de um **tablet desativado**: é recebida como "por confirmar" e, só depois, o tablet apaga o que tinha.
- O reenvio é seguro porque cada registo tem um ID gerado no cliente e a API ignora duplicados (ADR-001, escolha da stack).

### 4. Por baixo: tokens, cookies e funções restritas

- **Tokens:** a sessão da Gestão, a sessão do tablet e a chave de dispositivo são valores aleatórios de 256 bits. A base guarda só o seu resumo (SHA-256). Chegam à API em **cookies `HttpOnly`, `Secure` e `SameSite`**, que o JavaScript não consegue ler.
- **Mesmo domínio:** a API e as duas apps ficam em subdomínios do **mesmo domínio** (por exemplo `api.`, `gestao.` e `registo.`). Assim os cookies são do próprio site e não são bloqueados pelos navegadores como cookies de terceiros (o Safari bloqueia-os). Os pedidos que alteram dados verificam também o cabeçalho `Origin`.
- **Funções restritas** (ADR-002), as únicas que correm antes de haver organização, devolvem só identificadores:
  - código da organização → identificador da organização;
  - resumo do token de sessão → organização, pessoa, sessão;
  - resumo da chave de dispositivo → organização, tablet.

  Procurar o email, verificar a senha, o PIN e o código de dois passos, e tudo o que vem depois, corre **dentro da organização**, pelo `comOrganizacao`, com RLS.
- **Tabelas:** contas, sessões, tablets, chaves de registo emitidas, contadores de tentativas, convites, códigos de recuperação e histórico de segurança são **tabelas da organização**, com RLS. A exceção são os contadores por endereço de rede antes de se saber a organização: tabela da plataforma, sem dados das organizações, apagada ao fim de 24 horas.
- **Segredos da aplicação autenticadora:** cifrados na base, com a chave numa variável de ambiente. Os códigos de recuperação guardam-se como resumo.
- **Contas da equipa da plataforma** (backoffice da plataforma, ADR-002): mesma receita da Gestão (senha, aplicação autenticadora obrigatória, sessões na base), mas com tabelas de contas e sessões **da plataforma**, uma entrada própria e o papel plataforma. Uma sessão da plataforma nunca serve na Gestão de uma organização, nem dá acesso aos dados dela.

### 5. Histórico de segurança

Tabela da organização, visível na Gestão a quem a administra. Regista:
- entradas na Gestão e no Registo Diário, com sucesso ou falha, e bloqueios (inclui o que o MySenior mostra em "Entradas no Registo Diário", RD-02);
- PINs criados e repostos, desbloqueios;
- verificação em dois passos ativada ou reposta;
- tablets registados e desativados;
- registos "por confirmar" aceites ou rejeitados.

O tempo de conservação decide-se no ADR-006 (RGPD e segurança).

### 6. Testes obrigatórios

O ADR-005 (estratégia de testes) decide onde vivem e como correm. Têm de existir:
1. **Organização da sessão:** uma organização enviada pelo cliente (cabeçalho, parâmetro ou corpo) é ignorada.
2. **Cancelamento imediato:** desativar uma pessoa ou um tablet, ou terminar as sessões, faz o pedido seguinte falhar.
3. **Bloqueio do PIN:** a 5.ª tentativa errada bloqueia só essa pessoa, durante o tempo previsto, nunca mais de 1 hora, e sobrevive a um reinício da API. A 10.ª tentativa errada no mesmo tablet em 15 minutos pausa esse tablet.
4. **Chave de registo:** expira às 14 horas e apaga-se à 5.ª tentativa errada offline.
5. **Fila:** um registo bem assinado e dentro da validade da chave é aceite com a autora da chave; um registo com outro nome escrito pelo cliente, assinatura errada ou hora fora da janela fica "por confirmar", nunca é descartado.
6. **Permissões:** quem tem **gerir equipa** num local não consegue atuar sobre alguém com acesso à Gestão ou com locais fora dos seus.
7. **Cookies:** têm `HttpOnly`, `Secure` e `SameSite`; um pedido de alteração com `Origin` estranho é recusado.
8. **Funções restritas:** devolvem só identificadores (coberto também pelo teste de catálogo do ADR-002).

## Consequências

**Positivas**
- Uma quebra de rede não para a equipa em turno, e nenhum registo se perde: o que não se consegue confirmar fica "por confirmar".
- Um registo em nome da pessoa errada fica difícil: toque no nome, PIN pessoal trocado na primeira entrada, sessão curta e bloqueio por pessoa.
- Uma senha da Gestão roubada, sozinha, não chega para entrar.
- Desativar uma pessoa, uma sessão ou um tablet tem efeito imediato com rede.
- Sem serviços novos: tudo vive no Postgres e na API (ADR-001, escolha da stack).

**Negativas e riscos**

| Risco | Mitigação |
|---|---|
| Alguém copiar os dados do tablet e descobrir os PINs com chave de registo | Chaves só de quem entrou nas últimas 14 horas, apagadas ao 5.º erro offline. Recomendação de prender o tablet na aplicação. |
| Alguém bloquear de propósito uma colega à noite, errando o PIN dela | O bloqueio nunca passa de 1 hora e fica no histórico. O travão por tablet limita a repetição. |
| Funcionária desativada entra offline até ao fim da janela de 14 horas | Aceite. Com rede, o corte é imediato; os registos dela depois da desativação ficam "por confirmar". |
| Esquecer o PIN de noite sem ninguém contactável | Aceite por agora: espera pela manhã. Registar mais tarde com a hora real fica para o ticket do Registo Diário. |
| Único administrador perde o acesso | Aviso permanente para nomear um segundo; reposição manual pela plataforma (ADR-006, RGPD e segurança). |
| PWA no iOS: o Registo Diário instalado no ecrã inicial tem cookies e armazenamento separados do Safari | O registo do tablet faz-se **dentro** da app instalada. Se o armazenamento for apagado, o tablet regista-se de novo. |
| Apps e API em domínios diferentes (por exemplo, o staging em `*.pages.dev`) partem os cookies no Safari | Usar subdomínios do mesmo domínio também em staging. Fica para o [#19](https://github.com/RafaelFerraz2002/senior-care-platform/issues/19) (alojamento). |
| Fotografias da equipa no ecrã de entrada são dados pessoais | Opcionais; só aparecem a quem está num tablet daquele local. Regras no ADR-006. |
| Dados de vários locais no tablet: offline, mostrar a cada pessoa só os utentes dela é feito pela app no tablet | Cada pessoa só descarrega os seus locais (3.5); escolher só os locais necessários; dados apagados com a última chave de registo. |

**Decisões que ficam para outros ADRs e tickets**
- ADR-005 ([#22](https://github.com/RafaelFerraz2002/senior-care-platform/issues/22), estratégia de testes): onde e como correm os testes da secção 6.
- ADR-006 ([#23](https://github.com/RafaelFerraz2002/senior-care-platform/issues/23), RGPD e segurança): conservação do histórico de segurança e dos endereços de rede, fotografias da equipa e procedimento de recuperação do único administrador.
- [#17](https://github.com/RafaelFerraz2002/senior-care-platform/issues/17) (scaffolding): bibliotecas de Argon2id, TOTP e lista de senhas proibidas; função de resumo no navegador; nomes das tabelas e funções.
- [#19](https://github.com/RafaelFerraz2002/senior-care-platform/issues/19) (alojamento): API e apps no mesmo domínio, em staging e produção.
- Ticket do Registo Diário: o mínimo que o tablet guarda para trabalhar offline, e registar mais tarde com a hora real.
- Mais tarde, em tickets próprios: telemóveis pessoais no Registo Diário, passkeys na Gestão, chaves da API pública (AD-09) e a app Família.
