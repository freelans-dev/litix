# CLAUDE.md - Litix SaaS

Este arquivo configura o comportamento do Claude Code ao trabalhar neste repositorio.

---

## Constitution

O AIOS possui uma **Constitution formal** com principios inegociaveis e gates automaticos.

**Documento completo:** `.aios-core/constitution.md`

**Principios fundamentais:**

| Artigo | Principio | Severidade |
|--------|-----------|------------|
| II | Agent Authority | NON-NEGOTIABLE |
| III | Story-Driven Development | MUST |
| IV | No Invention | MUST |
| V | Quality First | MUST |
| VI | Absolute Imports | SHOULD |

**Gates automaticos bloqueiam violacoes.** Consulte a Constitution para detalhes completos.

---

## Sobre o Projeto

**Litix** e uma plataforma SaaS de monitoramento e consulta processual multi-provider para escritorios de advocacia no Brasil.

### Stack Tecnica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 15 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Auth | Supabase Auth (cookie-based SSR) |
| Database | Supabase PostgreSQL + RLS multi-tenant |
| Billing | Stripe (Checkout + Webhooks + Portal) |
| Caching | Vercel KV (Upstash Redis) |
| Background Jobs | Vercel Cron + Trigger.dev (futuro) |
| Deploy | Vercel |
| Providers | Judit, DataJud, Codilo, Escavador, Predictus |

### Supabase
- Project ref: `iicaiojtjomtdkszgpwd`
- Service client: `createServiceClient()` (bypasses RLS)
- SSR client: `createSSRClient()` (cookie-based, respects RLS)
- Auth hook: Edge Function para multi-tenant claims

---

## Estrutura do Projeto

```
litix-saas/
├── .aios-core/              # Framework AIOS (agents, tasks, workflows)
├── .claude/                 # Claude Code config
│   ├── CLAUDE.md            # Este arquivo
│   ├── commands/AIOS/agents/# Agent definitions
│   └── rules/               # Rules adicionais
├── docs/
│   └── stories/             # Development stories (AIOS workflow)
├── packages/
│   └── providers/           # Multi-provider data fusion
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/v1/          # REST API routes
│   │   └── dashboard/       # Dashboard pages
│   ├── components/ui/       # shadcn/ui components
│   ├── features/            # Feature modules
│   ├── lib/                 # Shared utilities
│   │   ├── supabase/        # Supabase clients
│   │   ├── auth.ts          # getTenantContext()
│   │   ├── crypto.ts        # HMAC, CNJ formatting
│   │   ├── plan-limits.ts   # Plan limit checking + KV cache
│   │   ├── judit-fetch.ts   # Judit API integration
│   │   ├── alert-generator.ts
│   │   ├── webhook-dispatcher.ts
│   │   └── webhook-payload.ts
│   └── middleware.ts        # Auth middleware
├── supabase/
│   └── migrations/          # SQL migrations (ordered 001_, 002_, etc.)
├── vercel.json              # Cron config
└── .env.local               # Environment variables (never commit)
```

---

## Sistema de Agentes

### Ativacao de Agentes
Use `@agent-name` ou `/AIOS:agents:agent-name`:

| Agente | Persona | Escopo Principal |
|--------|---------|------------------|
| `@dev` | Dex | Implementacao de codigo |
| `@qa` | Quinn | Testes e qualidade |
| `@architect` | Aria | Arquitetura e design tecnico |
| `@pm` | Morgan | Product Management, PRDs |
| `@po` | Pax | Product Owner, backlog |
| `@sm` | River | Scrum Master, stories |
| `@analyst` | Atlas | Pesquisa e analise |
| `@data-engineer` | Dara | Database design, migrations |
| `@ux-design-expert` | Uma | UX/UI design |
| `@devops` | Gage | CI/CD, git push (EXCLUSIVO) |

### Comandos de Agentes
Use prefixo `*` para comandos:
- `*help` - Mostrar comandos disponiveis
- `*draft` - Criar story (via @sm)
- `*develop` - Implementar story (via @dev)
- `*exit` - Sair do modo agente

### Mapeamento Agente -> Codebase

| Agente | Diretorios Principais |
|--------|----------------------|
| `@dev` | `src/`, `packages/` |
| `@architect` | `docs/architecture/`, system design |
| `@data-engineer` | `supabase/migrations/`, schema design |
| `@qa` | Tests, quality gates |
| `@po` | `docs/stories/`, backlog |
| `@devops` | `.github/`, CI/CD, git push |

---

## Story-Driven Development

**TODO desenvolvimento DEVE seguir o workflow AIOS:**

1. **@pm** cria PRD/epic -> **@sm** quebra em stories
2. **@po** valida e prioriza stories
3. **@dev** implementa seguindo a story
4. **@data-engineer** valida migrations
5. **@qa** testa
6. **@devops** faz push

### Regras
- Todo desenvolvimento comeca com uma story em `docs/stories/`
- Stories seguem formato AIOS (ID, acceptance criteria, dev notes, tasks)
- Atualize checkboxes conforme completa: `[ ]` -> `[x]`
- Mantenha a secao File List na story
- NUNCA implemente sem story aprovada

---

## Padroes de Codigo

### Convencoes de Nomenclatura

| Tipo | Convencao | Exemplo |
|------|-----------|---------|
| Componentes | PascalCase | `EditOfficeDataSheet` |
| Hooks | prefixo `use` | `useTenantContext` |
| Arquivos | kebab-case | `edit-office-data-sheet.tsx` |
| Constantes | SCREAMING_SNAKE_CASE | `BATCH_SIZE` |
| Interfaces | PascalCase + sufixo | `AlertsPageProps` |

### Imports
**Sempre use imports absolutos com `@/`.**
```typescript
// Correto
import { createServiceClient } from '@/lib/supabase/service'

// Errado
import { createServiceClient } from '../../../lib/supabase/service'
```

**Ordem de imports:**
1. React/Next.js
2. External libraries (stripe, zod, date-fns)
3. UI components (@/components/ui)
4. Lib utilities (@/lib)
5. Feature imports (@/features)

### TypeScript
- Sem `any` - Use tipos apropriados ou `unknown` com type guards
- Sempre defina interface de props para componentes
- Use `as const` para objetos/arrays constantes

### Error Handling (API Routes)
```typescript
try {
  // Operation
} catch (err) {
  const msg = err instanceof Error ? err.message : 'Unknown error'
  console.error(`[endpoint] Error: ${msg}`)
  return NextResponse.json({ error: msg }, { status: 500 })
}
```

---

## Database

### Convencoes SQL
- Tabelas: snake_case plural (`monitored_cases`, `tenant_members`)
- Colunas: snake_case (`stripe_customer_id`, `last_checked_at`)
- Constraints: prefixo descritivo (`chk_`, `uq_`, `fk_`)
- Indexes: `idx_{table}_{columns}`
- RLS habilitado em TODAS as tabelas
- Migrations numeradas: `001_`, `002_`, `003_`, `004_`

### Tabelas Principais
| Tabela | Descricao |
|--------|-----------|
| `tenants` | Escritorios (multi-tenant root) |
| `tenant_members` | Membros do escritorio |
| `profiles` | Perfis de usuario (Supabase Auth) |
| `monitored_cases` | Processos judiciais (64+ colunas) |
| `case_movements` | Movimentacoes processuais |
| `clients` | Clientes do escritorio |
| `alerts` | Alertas de movimentacao |
| `subscriptions` | Assinaturas Stripe |
| `plan_limits` | Limites por plano |
| `webhook_endpoints` | Endpoints de webhook do tenant |
| `webhook_deliveries` | Historico de entregas |
| `monitoring_jobs` | Auditoria do cron de monitoramento |

### IMPORTANTE: Validacao de Migrations
**Toda migration DEVE ser validada pelo `@data-engineer` antes de ser aplicada.**

---

## Testes & Quality Gates

### Comandos de Teste
```bash
npm test                    # Rodar testes
npm run lint                # ESLint
npm run typecheck           # TypeScript (--skipLibCheck)
```

### Quality Gates (Pre-Push)
Antes de push, todos os checks devem passar:
```bash
npm run lint
npx tsc --noEmit --skipLibCheck
npm test
```

---

## Convencoes Git

### Commits
Seguir Conventional Commits + referenciar Story ID:
- `feat: implement webhook dispatcher [LITIX-5.2]`
- `fix: correct plan cache invalidation [LITIX-12.3]`

### Branches
- `main` - Branch principal
- `feat/LITIX-X.Y-descricao` - Features
- `fix/LITIX-X.Y-descricao` - Correcoes

### Push Authority
**Apenas `@devops` pode fazer push para remote.**

---

## API Patterns

### Route Handler Pattern
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getTenantContext } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  // ... business logic
}
```

### Cron Endpoint Pattern
- Secured via `CRON_SECRET` Bearer token
- Defined in `vercel.json`
- Exports both POST and GET

---

## Otimizacao Claude Code

### Uso de Ferramentas
| Tarefa | Use | Nao Use |
|--------|-----|---------|
| Buscar conteudo | `Grep` tool | `grep`/`rg` no bash |
| Ler arquivos | `Read` tool | `cat`/`head`/`tail` |
| Editar arquivos | `Edit` tool | `sed`/`awk` |
| Buscar arquivos | `Glob` tool | `find` |
| Operacoes complexas | `Task` tool | Multiplos comandos manuais |

---

*Litix SaaS - AIOS-Powered Development*
*Story-Driven | Agent-Orchestrated | Quality-First*
