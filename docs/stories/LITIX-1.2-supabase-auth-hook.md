# Story LITIX-1.2: Supabase Auth + Auth Hook (JWT com tenant_id e role)

**Epic:** Epic 1 - Fundacao Multi-Tenant e Autenticacao
**Status:** Draft
**Prioridade:** Must
**Estimativa:** 8 pontos
**Dependencias:** LITIX-1.1 (schema deve existir com tabelas tenants, tenant_members, profiles, subscriptions)

---

## User Story

Como advogado, quero me cadastrar na plataforma e ser automaticamente vinculado ao meu escritorio para acessar o dashboard com as permissoes corretas.

## Contexto

O Supabase Auth gera JWTs padrao sem claims customizados de `tenant_id` e `role`. A decisao ADR-002 define o uso de um Auth Hook (Supabase Edge Function) que intercepta o evento de login e injeta `tenant_id`, `role` e `member_id` no JWT. Isso e critico porque as policies RLS usam `auth.tenant_id()` que le esses claims — sem o Auth Hook, o isolamento multi-tenant nao funciona. Tambem e necessario o fluxo de signup que cria o tenant, membro e profile em uma transacao atomica, e o sistema de convite por email para adicionar novos membros ao escritorio existente.

---

## Acceptance Criteria

- [ ] AC1: Signup via Supabase Auth (email/senha) funciona — cria registro em `auth.users`, `tenants`, `tenant_members` (role=owner), `profiles` e `subscriptions` (plan=free) atomicamente via Server Action
- [ ] AC2: Auth Hook (Supabase Edge Function `supabase/functions/auth-hook/index.ts`) intercepta login, faz SELECT em `tenant_members` para o `user_id`, e retorna `app_metadata: { tenant_id, role, member_id }` injetando no JWT
- [ ] AC3: JWT resultante contem os claims `tenant_id`, `role` e `member_id` verificaveis via `auth.jwt()` no banco
- [ ] AC4: Primeiro usuario de um tenant sempre recebe role `owner` — enforced no Server Action de signup
- [ ] AC5: Convite por email funciona: owner/admin pode convidar usuario via `POST /auth/invite`, sistema envia email com link magico contendo token de convite
- [ ] AC6: Aceite de convite (`POST /auth/accept-invite`) cria conta no Supabase Auth se necessario e insere em `tenant_members` com role especificado pelo convidante
- [ ] AC7: Login retorna sessao valida com access_token e refresh_token; cookie `sb-access-token` e `sb-refresh-token` setados (via `supabase.auth.setSession`)
- [ ] AC8: Logout invalida a sessao e limpa os cookies
- [ ] AC9: Refresh token funciona transparentemente via Supabase client-side
- [ ] AC10: Paginas de login e signup sao responsivas e acessiveis (Next.js, no grupo de rotas `(auth)`)
- [ ] AC11: Validacao de formulario com Zod: email valido, senha minimo 8 caracteres, nome do escritorio obrigatorio
- [ ] AC12: Usuario sem `tenant_members` ativo recebe erro 403 no Auth Hook (sem acesso ao dashboard)

---

## Dev Notes

### Schema Relevante

Tabelas lidas/escritas nesta story:
- `auth.users` — criado pelo Supabase Auth automaticamente
- `tenants` — criado no signup (`INSERT INTO tenants (slug, name, plan)`)
- `tenant_members` — criado no signup (`INSERT INTO tenant_members (tenant_id, user_id, role)`)
- `profiles` — criado no signup (`INSERT INTO profiles (tenant_id, user_id, display_name, email, oab_number, oab_uf)`)
- `subscriptions` — criado no signup (`INSERT INTO subscriptions (tenant_id, plan, status)`)

O Auth Hook le:
```sql
SELECT tenant_id, role, id AS member_id
FROM tenant_members
WHERE user_id = $1 AND is_active = true
LIMIT 1;
```

### Auth Hook (Edge Function)

```typescript
// supabase/functions/auth-hook/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const payload = await req.json();
  const { user_id } = payload;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: membership } = await supabase
    .from('tenant_members')
    .select('tenant_id, role, id')
    .eq('user_id', user_id)
    .eq('is_active', true)
    .single();

  if (!membership) {
    return new Response(JSON.stringify({ error: 'No active membership' }), { status: 403 });
  }

  return new Response(JSON.stringify({
    app_metadata: {
      tenant_id: membership.tenant_id,
      role: membership.role,
      member_id: membership.id,
    },
  }));
});
```

Configurar em Supabase Dashboard: Authentication > Hooks > Custom Access Token Hook > apontar para esta function.

### Slug Generation

O slug do tenant e gerado a partir do nome do escritorio:
```typescript
function generateSlug(firmName: string): string {
  return firmName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}
// "Escritorio Silva & Associados" -> "escritorio-silva-associados"
// Se slug ja existe, adicionar sufixo numerico: "escritorio-silva-2"
```

### API Contracts Relevantes

```
POST /auth/signup
POST /auth/login
POST /auth/logout
POST /auth/refresh
POST /auth/invite
POST /auth/accept-invite
POST /auth/forgot-password
POST /auth/reset-password
```

Implementados como Next.js API Routes em `src/app/api/v1/auth/`.

Request/Response do signup documentado em `docs/litix-architecture.md` secao 5.2.

### Componentes/Arquivos Esperados

```
supabase/
  functions/
    auth-hook/
      index.ts              -- Auth Hook Edge Function (Deno)
      deno.json             -- Deno config

src/
  app/
    (auth)/
      login/
        page.tsx            -- Pagina de login
      signup/
        page.tsx            -- Pagina de signup
      invite/
        [token]/
          page.tsx          -- Pagina de aceite de convite
    api/
      v1/
        auth/
          signup/
            route.ts        -- POST /api/v1/auth/signup
          invite/
            route.ts        -- POST /api/v1/auth/invite
          accept-invite/
            route.ts        -- POST /api/v1/auth/accept-invite
  features/
    auth/
      components/
        login-form.tsx      -- Formulario de login com validacao Zod
        signup-form.tsx     -- Formulario de signup
        invite-form.tsx     -- Formulario de aceite de convite
      hooks/
        use-auth.ts         -- Hook com login(), logout(), signup()
      services/
        auth.service.ts     -- signUp(), inviteMember(), acceptInvite()
      schemas/
        auth.schema.ts      -- Zod schemas para formularios e API inputs
      types/
        auth.types.ts       -- AuthUser, Session, SignupInput types
  lib/
    supabase/
      client.ts             -- createBrowserClient() para uso no browser
      server.ts             -- createServerClient() para Server Components e API Routes
      middleware.ts         -- createMiddlewareClient() para middleware.ts
  stores/
    auth-store.ts           -- Zustand store com user, session, isLoading
```

### Notas Tecnicas

- **Supabase Client Pattern:** Tres clientes distintos: `client.ts` (browser, usa `createBrowserClient`), `server.ts` (Server Components/API Routes, usa `createServerClient` com cookies), `middleware.ts` (Next.js middleware, usa `createMiddlewareClient`).
- **Auth Hook configurado via Supabase Dashboard** (nao via migrations): Authentication > Hooks > Custom Access Token Hook > `https://{project}.supabase.co/functions/v1/auth-hook`.
- **Server Action para signup:** Criar tenant, member, profile e subscription em uma Server Action com `supabase.auth.admin.createUser()` + inserts. Usar `service_role` key para os inserts (bypassa RLS durante a criacao inicial).
- **Convite:** Usar `supabase.auth.admin.generateLink({ type: 'invite', email })` para gerar link magico. Armazenar metadados do convite (role, tenant_id) no token ou em tabela temporaria.
- **Senha:** Minimo 8 caracteres, validado no schema Zod e reforçado pelo Supabase Auth.
- **Variavel de ambiente:** `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` para client-side; `SUPABASE_SERVICE_ROLE_KEY` apenas server-side (nunca exposta ao browser).

---

## Tasks

- [ ] Task 1: Criar Auth Hook (Supabase Edge Function)
  - [ ] Subtask 1.1: Criar `supabase/functions/auth-hook/index.ts` com logica de lookup de membership
  - [ ] Subtask 1.2: Criar `supabase/functions/auth-hook/deno.json`
  - [ ] Subtask 1.3: Configurar Auth Hook no Supabase Dashboard (ou via CLI)
  - [ ] Subtask 1.4: Testar Auth Hook localmente com `supabase functions serve`

- [ ] Task 2: Configurar clientes Supabase para Next.js
  - [ ] Subtask 2.1: Instalar `@supabase/ssr` e `@supabase/supabase-js`
  - [ ] Subtask 2.2: Criar `src/lib/supabase/client.ts` (browser client)
  - [ ] Subtask 2.3: Criar `src/lib/supabase/server.ts` (server client com cookies)
  - [ ] Subtask 2.4: Criar `src/lib/supabase/middleware.ts` (middleware client)
  - [ ] Subtask 2.5: Configurar variaveis de ambiente em `.env.local` e `.env.example`

- [ ] Task 3: Implementar schemas Zod de auth
  - [ ] Subtask 3.1: Criar `src/features/auth/schemas/auth.schema.ts`
  - [ ] Subtask 3.2: Schemas: `SignupSchema`, `LoginSchema`, `InviteSchema`, `AcceptInviteSchema`

- [ ] Task 4: Implementar Server Actions / API Routes de auth
  - [ ] Subtask 4.1: `POST /api/v1/auth/signup` — criar user + tenant + member + profile + subscription atomicamente
  - [ ] Subtask 4.2: `POST /api/v1/auth/invite` — convidar membro (owner/admin only)
  - [ ] Subtask 4.3: `POST /api/v1/auth/accept-invite` — aceitar convite e criar member

- [ ] Task 5: Implementar paginas de auth
  - [ ] Subtask 5.1: `src/app/(auth)/login/page.tsx` com LoginForm
  - [ ] Subtask 5.2: `src/app/(auth)/signup/page.tsx` com SignupForm
  - [ ] Subtask 5.3: `src/app/(auth)/invite/[token]/page.tsx` com InviteForm
  - [ ] Subtask 5.4: Layout do grupo `(auth)` sem sidebar (apenas logo e centrado)

- [ ] Task 6: Implementar hook `use-auth.ts` e store
  - [ ] Subtask 6.1: `src/features/auth/hooks/use-auth.ts` — login(), logout(), signup()
  - [ ] Subtask 6.2: `src/stores/auth-store.ts` — Zustand store com user, session, role, tenantId

- [ ] Task 7: Testes
  - [ ] Subtask 7.1: Teste: signup cria tenant + member (owner) + profile + subscription
  - [ ] Subtask 7.2: Teste: JWT apos login contem tenant_id, role, member_id
  - [ ] Subtask 7.3: Teste: usuario sem membership ativo recebe 403
  - [ ] Subtask 7.4: Teste: convite envia email e aceite cria tenant_member

---

## Testes

| Caso de Teste | Tipo | Resultado Esperado |
|---|---|---|
| Signup com dados validos | Integration | Cria tenant + member (owner) + profile + subscription |
| Signup com email duplicado | Integration | Erro 409 "Email ja cadastrado" |
| Signup com nome de escritorio duplicado | Integration | Slug com sufixo numerico gerado automaticamente |
| Login com credenciais validas | Integration | JWT com tenant_id, role=owner, member_id nos claims |
| Login com credenciais invalidas | Integration | Erro 401 |
| Auth Hook com user sem membership | Unit | Retorna 403 |
| Convite por email (owner convida admin) | Integration | Email enviado, token valido |
| Aceite de convite | Integration | tenant_member criado com role correto |
| Logout | Integration | Cookies limpos, sessao invalida |
| Formulario de signup sem nome do escritorio | UI | Erro de validacao exibido |

---

## Definition of Done

- [ ] Auth Hook deployado e configurado no Supabase
- [ ] Signup cria todos os registros necessarios atomicamente
- [ ] JWT contem tenant_id, role e member_id apos login
- [ ] Paginas de login, signup e aceite de convite funcionando
- [ ] Validacao Zod nos formularios e API routes
- [ ] Variaveis de ambiente documentadas em `.env.example`
- [ ] Testes passando
- [ ] Code review aprovado
- [ ] Story status: Ready for Review
