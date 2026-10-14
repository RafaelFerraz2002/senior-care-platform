# ADR-001: Escolha da stack

- **Estado:** Aceite
- **Data:** 2026-10-14
- **Ticket:** [#13](https://github.com/RafaelFerraz2002/senior-care-platform/issues/13) (épico [#1](https://github.com/RafaelFerraz2002/senior-care-platform/issues/1))
- **Requisitos:** GL-16 (o que reaproveitar/mudar face ao MySenior)

## Contexto

Vamos construir uma plataforma SaaS multi-organização para gestão de respostas sociais para idosos: Estrutura Residencial, Centro de Dia e Apoio Domiciliário. O âmbito é equivalente ao MySenior, que hoje é usado pela Coophousing, a primeira cliente. A plataforma tem duas faces:

- **Gestão:** backoffice web com cerca de 20 módulos (utentes, plano individual, saúde, estatísticas, funcionários, candidaturas, administração, mensalidades…). Tem muitas tabelas, filtros, formulários longos e relatórios em PDF.
- **Registo Diário:** usado pelos ajudantes durante o turno para registar atividades, ocorrências e comunicações, entrando com um PIN.

O MySenior atual corre em AngularJS 1.3, que já não tem suporte. Não há código para reaproveitar, só o conhecimento funcional (GL-16).

### Critérios de decisão

| Critério | O que sabemos |
|---|---|
| Natureza do projeto | A escolha é feita pelo que o projeto precisa, não pela experiência prévia de quem o desenvolve. |
| Rede | Wi-Fi bom com quebras raras. **Não** é preciso um modo offline completo, mas um registo não se pode perder numa quebra: guarda-se e reenvia-se. |
| Dispositivos do Registo Diário | Sobretudo tablets e telemóveis **da instituição, partilhados**, com entrada por PIN. Também deve funcionar em telemóveis pessoais. |
| Capacidades do dispositivo | Notificações push e câmara (fotos de feridas, documentos). NFC não é preciso para já (fica no E11). |
| Integrações futuras | App Família (E9), API pública com chaves (AD-\*) e, eventualmente, uma app nativa. |
| Dados | Dados de saúde de idosos, uma categoria especial no RGPD. Alojamento na UE com backups (detalhe no ADR-006). |
| Orçamento | Produção a **10–25 €/mês**; dev e staging grátis. |
| Equipa | Um programador com apoio de IA. A stack tem de ser fácil de manter e de testar. |

## Opções consideradas

### A. Monorepo TypeScript com a API separada das apps ✅

A API em NestJS + PostgreSQL, e duas apps React: a Gestão como SPA e o Registo Diário como PWA. Os tipos, as validações e o cliente da API são partilhados entre todos.

- **Prós:**
  - uma só linguagem de ponta a ponta;
  - as regras de validação escrevem-se uma vez;
  - a API separada serve diretamente a app Família, a API pública e uma futura app nativa;
  - corre em Docker em qualquer fornecedor;
  - o NestJS impõe uma estrutura modular adequada a um sistema grande.
- **Contras:** tem mais peças e um setup inicial maior do que um monólito full-stack.

### B. Monólito Next.js (Gestão e Registo Diário na mesma app)

- **Prós:** menos peças e o arranque mais rápido.
- **Contras:**
  - a interface e a API ficam misturadas, e a API pública e a app Família encaixam mal;
  - o plano grátis da Vercel não permite uso comercial;
  - a renderização no servidor não traz benefício a apps que estão atrás de login;
  - a PWA e o login por PIN num dispositivo partilhado encaixam pior;
  - as tarefas em segundo plano e o Web Push precisam de um processo sempre ligado.

### C. Supabase (Postgres, autenticação e ficheiros prontos) + React

- **Prós:** é o mais rápido a dar resultados e já traz isolamento por organização na base de dados (RLS).
- **Contras:**
  - o login por **PIN num dispositivo partilhado** não encaixa na autenticação do Supabase;
  - o plano Pro custa 25 $/mês, já no topo do orçamento, e o plano grátis suspende após uma semana de inatividade e não tem backups;
  - a lógica de negócio fica repartida entre SQL e funções, e é difícil de testar;
  - é um fornecedor dos EUA a guardar dados de saúde, e ficamos dependentes da plataforma.

*Variante da A:* o backend em .NET ou Java/Spring é igualmente adequado ao domínio, mas perde-se a partilha de tipos e validações com as apps, porque passam a ser duas linguagens.

## Decisão

**Opção A.** O detalhe por camada está a seguir. Cada decisão indica porquê e o que foi rejeitado.

### 1. Estrutura do monorepo

```
senior-care-platform/
├─ apps/
│  ├─ api/          NestJS: API REST, um módulo por domínio
│  ├─ gestao/       React SPA: backoffice
│  └─ registo/      React PWA: Registo Diário
├─ packages/
│  ├─ shared/       schemas Zod e tipos partilhados
│  ├─ api-client/   cliente gerado a partir do OpenAPI da API
│  ├─ ui/           design system (Tailwind + shadcn/ui)
│  └─ config/       ESLint, TypeScript e Prettier partilhados
├─ docs/adr/
└─ docker-compose.yml
```

- **Ferramentas:** **pnpm** workspaces + **Turborepo** (build, lint e testes só no que mudou), e **Node LTS** fixado no `.nvmrc`.
- **Contrato:** a API publica o seu OpenAPI, e daí gera-se o `api-client`, que nunca se escreve à mão. Uma app desalinhada da API falha na compilação.
- **Duas apps e não uma:** o Registo Diário tem login por PIN, uma interface para tablet e é uma PWA. A Gestão é um backoffice denso. Separadas, cada uma fica mais simples e o Registo fica mais leve.

### 2. Backend (`apps/api`)

| Decisão | Porquê | Rejeitado |
|---|---|---|
| **NestJS** | Estrutura obrigatória: módulos, injeção de dependências, guards para permissões por perfil, testes. É precisa para cerca de 20 domínios. | **Express:** sem estrutura. **Fastify sozinho:** o mesmo problema (o NestJS pode correr sobre Fastify). **Hono/Elysia:** pensados para APIs pequenas ou edge. **AdonisJS:** comunidade muito menor. |
| **Monólito modular** | Um deploy, uma base de dados e transações simples (um registo que gera uma ocorrência e um alerta grava tudo junto). Um módulo por domínio, e os módulos só comunicam pelos serviços públicos. | **Microserviços:** rede, várias bases de dados e o custo de operação multiplicado, sem benefício para esta escala. |
| **PostgreSQL** | Dados relacionais com integridade; **Row-Level Security** para isolar organizações (decisão no ADR-002); JSON para questionários e escalas; disponível como serviço gerido em fornecedores da UE. | **MySQL/MariaDB:** sem RLS. **MongoDB:** dados muito relacionados. **SQL Server:** licenças. |
| **Drizzle + drizzle-kit** | Quase SQL, com tipos, e controlo direto das transações. Para o RLS, cada pedido define a organização atual na transação (`set_config`). Migrações versionadas no repositório. | **Prisma:** o RLS obriga a contornar o cliente e o SQL fica escondido. **TypeORM:** tipos fracos e historial de bugs. **Kysely:** não traz schema nem migrações. |
| **Zod partilhado (`packages/shared`)** | As regras escrevem-se uma vez e valem na API, nos formulários das duas apps e no OpenAPI gerado. | **class-validator:** decoradores de classe que não servem no frontend, por isso as regras ficariam duplicadas. |
| **pg-boss** | Fila de tarefas dentro do Postgres: sem serviço extra, e uma tarefa pode nascer na mesma transação que o registo. Serve para lembretes, push, PDFs (GL-10) e emails (GL-02). | **BullMQ + Redis:** mais um serviço a pagar e manter, para um volume baixo. Reavaliar se crescer. |
| **Web Push (VAPID)** | Padrão dos browsers, funciona em PWAs Android e iOS, envio direto e grátis. | **Firebase Cloud Messaging:** dependência da Google sem ganho. **OneSignal:** dados a passar por terceiros (RGPD). |
| **Armazenamento compatível com S3** | Fotos e documentos fora da base de dados. MinIO em dev, fornecedor da UE em produção, sem mudar código. | **Disco do servidor:** perde-se ao mudar de servidor. **Base de dados:** lenta e backups enormes. |

A autenticação (web e PIN) decide-se no **ADR-003** ([#15](https://github.com/RafaelFerraz2002/senior-care-platform/issues/15)). A única restrição daqui é que tem de ser implementável no NestJS sem um serviço de identidade externo.

### 3. Frontend (`apps/gestao`, `apps/registo`, `packages/ui`)

| Decisão | Porquê | Rejeitado |
|---|---|---|
| **React** | O maior ecossistema de componentes para backoffice, e TypeScript partilhado com a API. | **Angular:** pesado (o AngularJS do MySenior não é reaproveitável). **Vue/Svelte:** ecossistemas menores. |
| **Vite, em SPA** | As apps estão atrás de login, por isso o SEO não importa. Os ficheiros estáticos alojam-se grátis numa CDN e compilam rápido. | **Next.js:** a renderização no servidor só traz complexidade aqui. Um eventual perfil público (PP-01) pode ser uma página à parte. |
| **TanStack Router** | Rotas e parâmetros com tipos. Os filtros das listas ficam no URL, com tipos e partilháveis. | **React Router:** tipos fracos nos parâmetros e nos filtros. |
| **TanStack Query** | Cache, recarregamento, novas tentativas e estados de carregamento e erro. Cobre as quebras de rede curtas. | **Redux/RTK Query:** cerimónia a mais. **fetch à mão:** bugs de cache e de estado. |
| **Tailwind CSS + shadcn/ui** em `packages/ui` | Identidade visual própria (é um produto para vender). Os componentes ficam no repositório e são nossos, e formam um design system único para as duas apps. Acessibilidade via Radix. Peças: Calendar (react-day-picker, locale `pt`), **TanStack Table**, **shadcn Charts** (Recharts) para as Estatísticas e **Sonner** para notificações. | **Mantine:** completo, mas com um visual mais genérico e difícil de tornar próprio. **MUI:** pesado, com visual Material e partes pagas. **Ant Design:** pesado e difícil de personalizar. |
| **React Hook Form + Zod** | Os mesmos schemas da API, rápido em formulários longos (ficha do utente, avaliação diagnóstica) e integrado no shadcn Form. | **Formulário da biblioteca de UI:** prende-nos à biblioteca. |
| **PWA com vite-plugin-pwa** (Registo Diário) | Instalação no ecrã inicial, ícone e a própria app em cache para abrir mesmo com a rede em baixo. | **App nativa (React Native/Expo):** lojas, contas pagas e revisões, sem necessidade (só precisamos de push e câmara). |
| **Fila de envio em IndexedDB** | Cada registo vai primeiro para a fila no dispositivo, com um **ID gerado no cliente**. O reenvio é seguro porque a API ignora duplicados. Reenvia ao voltar a rede e ao abrir a app. | **Background Sync:** não existe no iOS. **Modo offline completo:** desnecessário com o Wi-Fi que existe. |
| **Só pt-PT** | Datas e números com o locale `pt-PT`. Sem biblioteca de traduções até haver um cliente noutra língua. | **i18n desde o início:** trabalho sem retorno por agora. |

### 4. Qualidade e ferramentas

*O que se testa, e quanto, define-se no **ADR-005** ([#22](https://github.com/RafaelFerraz2002/senior-care-platform/issues/22)). Aqui ficam só as ferramentas.*

| Decisão | Porquê | Rejeitado |
|---|---|---|
| **TypeScript `strict`** | Apanha `null`/`undefined` e tipos errados antes de correr o código. | Modo permissivo. |
| **ESLint + Prettier** | Plugins de React hooks e de TanStack Query, e o **eslint-plugin-boundaries**, que impede um módulo de importar o interior de outro e assim garante o monólito modular. O Prettier usa o plugin de Tailwind para ordenar as classes. | **Biome:** ainda sem equivalente às regras de fronteiras. Pode vir a substituir o Prettier. |
| **Vitest** | Uma só ferramenta de testes em todo o monorepo, rápida e alinhada com o Vite. | **Jest:** mais lento, com configuração à parte para TS/ESM; seriam dois sistemas. |
| **Testcontainers** | Postgres real nos testes de integração. O RLS, as migrações e as transações só se testam a sério assim. | **Mocks da base de dados:** os testes passam e a produção falha. **SQLite:** sem RLS e com outro comportamento. |
| **Testing Library + Playwright** | Componentes, e testes ponta a ponta em Chromium, Firefox e **WebKit** (Safari em iPhone e iPad), com emulação de tablet. | **Cypress:** sem suporte real a WebKit, e mais lento. |
| **Lefthook** | Formatação e lint dos ficheiros alterados antes de cada commit, em paralelo e com um só binário. | **Husky + lint-staged:** duas dependências para o mesmo efeito. |
| **Conventional Commits no título do PR** | O squash merge transforma o título do PR no commit. Dá um histórico legível e um changelog automático no futuro. O CI valida o título. | **commitlint em cada commit:** os commits intermédios desaparecem no squash. |

### 5. Execução e ambientes

*O fornecedor concreto de produção decide-se no [#19](https://github.com/RafaelFerraz2002/senior-care-platform/issues/19) e no **ADR-006** ([#23](https://github.com/RafaelFerraz2002/senior-care-platform/issues/23)).*

- **API num contentor Docker; apps como ficheiros estáticos numa CDN.** A mesma imagem corre local, em staging e em produção, em qualquer fornecedor.
  - *Rejeitado:* plataformas serverless (o pg-boss e o Web Push precisam de um processo sempre ligado) e qualquer plataforma que nos prenda.
- **Desenvolvimento local com `docker compose`:** Postgres, **MinIO** (S3) e **Mailpit**, que apanha os emails sem os enviar.
- **Ambientes:**
  - **Local:** Docker.
  - **Staging (grátis):** Neon (Postgres em Frankfurt), Cloudflare Pages para as apps, e a API num plano grátis com Docker. Pode "adormecer", o que é aceitável para testes.
  - **Produção:** fornecedor da UE dentro do orçamento, com backups automáticos.
- **Erros:** Sentry no plano grátis, com os dados guardados em Frankfurt, configurado para **não enviar dados pessoais** (regras no ADR-006).

**Preços de referência (verificados a 2026-10-14, antes de IVA):**

| Opção | Custo/mês | Nota |
|---|---|---|
| VPS Hetzner CX23 + backups + IPv4 + Storage Box | ~10 € | Fornecedor da UE. **Neste momento os servidores cloud baratos estão indisponíveis para encomenda.** |
| Scaleway Managed PostgreSQL DB-DEV-S (Paris) | ~11 € + armazenamento | Fornecedor da UE, com backups diários (7 dias). |
| Render (Frankfurt) Starter + Postgres Basic | ~13–14 € | Fornecedor dos EUA, com região na UE. |
| Supabase Pro | ~23 € | Fornecedor dos EUA; serviria apenas como base de dados. |
| Neon Free / Cloudflare Pages / Sentry Developer | 0 € | Para dev e staging. |

## Consequências

**Positivas**
- Uma linguagem, tipos e validações partilhados de ponta a ponta. Uma mudança na API que parta uma app é detetada ao compilar.
- A API está pronta para a app Família, a API pública e uma eventual app nativa, sem refazer nada.
- Não ficamos presos a nenhum fornecedor: Docker, Postgres e S3 existem em todo o lado.
- Design system próprio, com identidade visual de produto.
- O Registo Diário dispensa as lojas de apps: a instalação e as atualizações são imediatas.

**Negativas e riscos**
- **Mais peças no início** (monorepo, geração do cliente da API, design system). Isto cai no ticket de scaffolding ([#17](https://github.com/RafaelFerraz2002/senior-care-platform/issues/17)) e no de CI ([#18](https://github.com/RafaelFerraz2002/senior-care-platform/issues/18)).
- **Componentes shadcn montados por nós:** os mais complexos (intervalo de datas, tabela com filtros) são feitos uma vez em `packages/ui`.
- **Push no iPhone** só funciona com a app adicionada ao ecrã inicial. Nos dispositivos da instituição isso faz-se uma vez na configuração; nos telemóveis pessoais tem de ser explicado ao utilizador.
- **NFC no iPhone** não é possível numa PWA. Se passar a ser preciso (E11), a mesma app embrulha-se em **Capacitor**, sem a reescrever.
- **Disponibilidade da Hetzner:** os servidores cloud baratos estão indisponíveis. Por isso a stack não depende de nenhum fornecedor, e o #19 decide entre as alternativas.

**Decisões que ficam para outros ADRs**
- Isolamento de dados por organização: ADR-002 ([#14](https://github.com/RafaelFerraz2002/senior-care-platform/issues/14)).
- Autenticação web + PIN: ADR-003 ([#15](https://github.com/RafaelFerraz2002/senior-care-platform/issues/15)).
- Processo de desenvolvimento e review: ADR-004 ([#21](https://github.com/RafaelFerraz2002/senior-care-platform/issues/21)).
- Estratégia de testes: ADR-005 ([#22](https://github.com/RafaelFerraz2002/senior-care-platform/issues/22)).
- Proteção de dados, RGPD e escolha do fornecedor de produção: ADR-006 ([#23](https://github.com/RafaelFerraz2002/senior-care-platform/issues/23)) e [#19](https://github.com/RafaelFerraz2002/senior-care-platform/issues/19).
