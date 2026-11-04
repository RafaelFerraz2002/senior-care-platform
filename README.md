# Senior Care Platform

Plataforma SaaS multi-organização para gestão de respostas sociais para idosos (Estrutura Residencial, Centro de Dia, Apoio Domiciliário). Tem duas faces:

- **Gestão**: o backoffice web.
- **Registo Diário**: uma PWA com PIN, pensada para dispositivos partilhados (tablets).

Primeira cliente: Coophousing. O repositório é público e **não contém dados reais**: todos os dados de exemplo são fictícios.

## Stack

- **API:** NestJS 12 (ESM) com PostgreSQL 17 (a API liga-se com um papel sem privilégios de superutilizador, `app`).
- **Apps:** React 19 e Vite 8; Gestão como SPA e Registo Diário como PWA (service worker, funciona offline depois da primeira visita).
- **Partilhado:** tipos e validações com Zod, cliente da API gerado a partir do OpenAPI, dados fictícios.
- **Monorepo:** pnpm 12 e Turborepo, TypeScript 6.
- **Testes:** Vitest, Testing Library, Testcontainers (Postgres real) e Playwright (Chromium e WebKit, com acessibilidade).
- **Serviços locais** (`docker compose`): PostgreSQL, MinIO (S3) e Mailpit (email).

## Decisões de arquitetura

As decisões estão em [`docs/adr/`](docs/adr/README.md).

- [ADR-001](docs/adr/001-stack.md): escolha da stack.
- [ADR-002](docs/adr/002-multi-tenancy.md): estratégia multi-organização.
- [ADR-003](docs/adr/003-auth.md): autenticação na Gestão e PIN no Registo Diário.
- [ADR-004](docs/adr/004-processo-desenvolvimento.md): processo de desenvolvimento e code review.
- [ADR-005](docs/adr/005-estrategia-testes.md): estratégia de testes.
- [ADR-006](docs/adr/006-rgpd-seguranca.md): proteção de dados, RGPD e segurança.

## Requisitos

- Node 26 (versão no `.nvmrc`) e pnpm 12.
- Docker (para os serviços locais, os testes de integração e os testes ponta a ponta).

## Como correr

```sh
cp .env.example .env
pnpm install
pnpm dev
```

O `pnpm dev` sobe os serviços (`docker compose up -d --wait`), a API e as duas apps:

| O quê          | Endereço                    |
| -------------- | --------------------------- |
| Gestão         | http://localhost:5173       |
| Registo Diário | http://localhost:5174       |
| API (estado)   | http://localhost:3000/saude |

As portas dos serviços no anfitrião (PostgreSQL 5440, MinIO 9010 e 9011, Mailpit 1035 e 8035) e a da API (`API_PORT`) mudam-se no `.env`, se estiverem ocupadas. Se mudar a `API_PORT`, o endereço de estado da API muda com ela.

Os serviços do `docker compose` **ficam a correr** quando se pára o `pnpm dev`. Para os parar: `docker compose down`.

## Comandos

| Comando                  | O que faz                                                                                 |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| `pnpm install`           | Instala as dependências e os hooks do git.                                                |
| `pnpm dev`               | Serviços, API e apps em modo de desenvolvimento.                                          |
| `pnpm build`             | Compila as apps e os pacotes.                                                             |
| `pnpm lint`              | ESLint (inclui a regra de fronteiras entre módulos).                                      |
| `pnpm typecheck`         | Verificação de tipos.                                                                     |
| `pnpm test`              | Testes unitários e de componentes. Rápido e sem Docker.                                   |
| `pnpm test:integracao`   | Testes de integração com Postgres real (precisa de Docker).                               |
| `pnpm test:e2e`          | Testes ponta a ponta com Playwright (precisa de Docker e dos browsers, ver abaixo).       |
| `pnpm test:tudo`         | Unitários, componentes, integração e ponta a ponta.                                       |
| `pnpm gerar:api-client`  | Regenera o `openapi.json` e o cliente da API depois de mudar a API.                       |
| `pnpm verificar:tamanho` | Mede o JavaScript de cada app e compara com `tamanho-apps.json` (depois de `pnpm build`). |

Os browsers do Playwright instalam-se uma vez:

```sh
pnpm --filter @scp/e2e exec playwright install chromium webkit
```

## Estado do projeto

Em arranque: o esqueleto está montado (monorepo, API com `/saude`, as duas apps, cliente gerado, testes e verificações) e **ainda não há funcionalidades**. O trabalho planeado está nos [Issues](https://github.com/RafaelFerraz2002/senior-care-platform/issues) e no Project "Senior Care Platform" do GitHub, organizado em épicos e fases (milestones).

Para contribuir, ver [`CONTRIBUTING.md`](CONTRIBUTING.md).
