# Litix

Plataforma SaaS de monitoramento e consulta processual multi-provider para escritórios de advocacia no Brasil.

## Estrutura do Repositório

```
litix/
├── src/                        # Next.js 15 App Router (SaaS principal)
│   ├── app/                    # Páginas, API routes, layouts
│   ├── components/             # Componentes UI (shadcn/ui)
│   ├── features/               # Módulos de feature (cases, billing, webhooks, team)
│   ├── lib/                    # Supabase, Stripe, utils
│   └── types/                  # TypeScript types (database.ts)
├── packages/
│   └── providers/              # Engine multi-provider de consulta processual
│       └── src/
│           ├── providers/      # DataJud, Codilo, Judit, Escavador, Predictus
│           ├── services/       # Orchestrator, monitoring, merge, webhook-dispatcher
│           ├── transformers/   # AppSheet transformer (90 campos)
│           ├── errors/         # Classes de erro tipadas
│           └── config/         # Configuração de providers
├── scripts/
│   ├── BuscaProcesso.gs        # Google Apps Script — busca processual
│   └── TestarTokenCodilo.gs    # Google Apps Script — teste de autenticação Codilo
├── docs/
│   ├── litix-prd.md            # Product Requirements Document
│   ├── litix-architecture.md   # Arquitetura técnica (18 tabelas, 40 endpoints, 8 ADRs)
│   ├── litix-ux-spec.md        # UX Specification
│   ├── market-research.md      # Pesquisa de mercado
│   ├── competitive-analysis.md # Análise competitiva
│   ├── architecture-recommendations.md
│   └── stories/                # User stories (LITIX-1.x a LITIX-12.x)
└── data/                       # Dados de referência (development/testing)
```

## Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| UI Components | shadcn/ui |
| Auth | Supabase Auth + Edge Function Hook |
| Database | Supabase PostgreSQL + RLS multi-tenant |
| Background Jobs | Trigger.dev + Supabase pg_cron |
| Caching | Vercel KV (Upstash Redis) |
| Billing | Stripe |
| Deploy | Vercel |
| Providers | DataJud, Codilo, Judit, Escavador, Predictus |

## Providers de Consulta

O pacote `packages/providers/` contém o engine de consulta multi-provider:

- **DataJud** — CNJ (gratuito, cobre 92 tribunais)
- **Codilo** — Consulta detalhada + monitoramento
- **Judit** — Consulta paralela com polling
- **Escavador** — Busca por CPF/CNPJ/OAB
- **Predictus** — Análise preditiva + histórico

## Planos

| Plano | Processos | Preço |
|-------|-----------|-------|
| Free | 10 | R$ 0 |
| Solo | 200 | R$ 59/mês |
| Escritório | 1.000 | R$ 249/mês |
| Pro | 5.000 | R$ 599/mês |

## Desenvolvimento

```bash
# Instalar dependências
npm install

# Rodar localmente
npm run dev

# Build
npm run build
```

### Variáveis de Ambiente

Copie `.env.example` para `.env.local` e preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
KV_REST_API_URL=
KV_REST_API_TOKEN=
```
