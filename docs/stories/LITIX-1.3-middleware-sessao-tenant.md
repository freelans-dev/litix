# Story LITIX-1.3: Middleware Next.js de Sessao e Tenant

**Epic:** Epic 1 - Fundacao Multi-Tenant e Autenticacao
**Status:** Done
**Prioridade:** Must
**Estimativa:** 5 pontos
**Dependencias:** LITIX-1.1, LITIX-1.2

---

## User Story

Como sistema, preciso de um middleware que valide a sessao e extraia o contexto do tenant em toda request para que rotas protegidas rejeitem acessos nao autorizados.

## Contexto

O Next.js App Router usa `middleware.ts` na raiz do projeto para interceptar todas as requests antes de chegar aos Server Components e API Routes. Este middleware valida o JWT do Supabase, extrai `tenant_id` e `role`, e redireciona para login se a sessao for invalida. Sem este middleware, qualquer rota do dashboard seria acessivel sem autenticacao.

---

## Acceptance Criteria

- [x] AC1: `middleware.ts` na raiz interceta todas as requests para `/dashboard/**` e `/api/v1/**`
- [x] AC2: Requests sem sessao valida para `/dashboard/**` sao redirecionadas para `/login`
- [x] AC3: Requests sem sessao valida para `/api/v1/**` retornam 401 JSON
- [x] AC4: Rotas publicas (`/login`, `/signup`, `/invite/**`, `/api/v1/auth/**`) sao liberadas sem validacao
- [x] AC5: Middleware injeta headers `x-tenant-id` e `x-user-role` nas requests para consumo em Server Components
- [x] AC6: Token expirado dispara refresh automatico via `supabase.auth.getSession()` — se refresh falhar, redireciona para login
- [x] AC7: `matcher` do middleware configurado para excluir assets estaticos (`_next/`, `favicon.ico`, imagens)
- [x] AC8: Funcao `createServerClient` de `@supabase/ssr` usada corretamente com cookies do Next.js
- [x] AC9: Testes unitarios do middleware com requests mockadas

---

## Dev Notes

### Implementacao do Middleware

```typescript
// middleware.ts (raiz do projeto)
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard') ||
    (request.nextUrl.pathname.startsWith('/api/v1') &&
     !request.nextUrl.pathname.startsWith('/api/v1/auth'))

  if (isProtectedRoute && !user) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user) {
    const tenantId = user.app_metadata?.tenant_id
    const role = user.app_metadata?.role
    supabaseResponse.headers.set('x-tenant-id', tenantId ?? '')
    supabaseResponse.headers.set('x-user-role', role ?? '')
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

### Helper para Server Components

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (cs) => cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
  )
}

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getTenantContext() {
  const user = await getCurrentUser()
  if (!user) return null
  return {
    tenantId: user.app_metadata?.tenant_id as string,
    role: user.app_metadata?.role as string,
    memberId: user.app_metadata?.member_id as string,
    userId: user.id,
  }
}
```

### Componentes/Arquivos Esperados

```
middleware.ts                         -- raiz do projeto
src/
  lib/
    supabase/
      client.ts                       -- browser client (LITIX-1.2)
      server.ts                       -- server client + getCurrentUser + getTenantContext
      middleware.ts                   -- helper para middleware (se necessario)
  hooks/
    use-tenant-context.ts             -- hook client-side para acessar contexto do tenant
```

### Notas Tecnicas

- Usar `supabase.auth.getUser()` (nao `getSession()`) no middleware — mais seguro pois valida com o servidor
- Headers `x-tenant-id` e `x-user-role` injetados pelo middleware podem ser lidos em Server Components via `headers()` do Next.js
- O middleware nao deve fazer queries ao banco — apenas validar o JWT e extrair claims
- Variaveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` devem estar no `.env.local`

---

## Tasks

- [x] Task 1: Implementar `middleware.ts`
  - [x] Subtask 1.1: Criar `middleware.ts` na raiz com logica de protecao de rotas
  - [x] Subtask 1.2: Configurar `matcher` para excluir assets estaticos
  - [x] Subtask 1.3: Adicionar injecao de headers `x-tenant-id` e `x-user-role`

- [x] Task 2: Implementar helpers de server client
  - [x] Subtask 2.1: Criar `src/lib/supabase/server.ts` com `createClient()`, `getCurrentUser()`, `getTenantContext()`
  - [x] Subtask 2.2: Criar `src/hooks/use-tenant-context.ts` para client components

- [x] Task 3: Configurar layouts protegidos
  - [x] Subtask 3.1: Criar `src/app/dashboard/layout.tsx` que verifica autenticacao via `getCurrentUser()`
  - [x] Subtask 3.2: Criar `src/app/(auth)/layout.tsx` que redireciona para dashboard se ja logado

- [x] Task 4: Testes
  - [x] Subtask 4.1: Teste: request sem cookie para `/dashboard` redireciona para `/login`
  - [x] Subtask 4.2: Teste: request sem cookie para `/api/v1/processes` retorna 401
  - [x] Subtask 4.3: Teste: request com JWT valido para `/dashboard` passa pelo middleware
  - [x] Subtask 4.4: Teste: headers `x-tenant-id` e `x-user-role` presentes em requests autenticadas

---

## Testes

| Caso de Teste | Tipo | Resultado Esperado |
|---|---|---|
| GET /dashboard sem sessao | Middleware | Redirect 302 para /login |
| GET /api/v1/processes sem sessao | Middleware | 401 JSON |
| GET /login com sessao valida | Middleware | Redirect para /dashboard |
| GET /dashboard com sessao valida | Middleware | 200, headers x-tenant-id presentes |
| GET /_next/static/chunk.js | Middleware | Passa sem validacao (matcher exclui) |
| JWT expirado com refresh valido | Middleware | Session renovada, request continua |

---

## Definition of Done

- [x] `middleware.ts` implementado e testado
- [x] Helpers de server client criados
- [x] Layouts protegidos configurados
- [x] Testes passando
- [x] Code review aprovado
- [x] Story status: Ready for Review
