-- =============================================================================
-- LITIX RLS Isolation Tests — supabase/tests/rls-isolation.test.sql
-- Story: LITIX-1.1 / AC13
-- Framework: pgTAP (compatível com supabase test db)
-- Data: 2026-03-01
--
-- EXECUÇÃO:
--   supabase test db
--
-- DESCRIÇÃO:
-- Verifica o isolamento entre tenants via Row Level Security (RLS).
-- Simula JWTs de dois tenants distintos e garante que:
--   1. Tenant A não vê dados do tenant B (SELECT retorna 0 rows)
--   2. INSERT com tenant_id errado é rejeitado pela policy
--   3. UPDATE cross-tenant é rejeitado
--   4. service_role bypassa RLS (acesso total)
--   5. plan_limits é leitura pública (sem auth)
--
-- ARQUITETURA DOS TESTES:
-- Usamos set_config('request.jwt.claims', ...) para simular o JWT do Supabase,
-- que é lido pelas funções auth.tenant_id() e auth.user_role(). As queries
-- rodam com o role 'authenticated' do Supabase.
-- =============================================================================

BEGIN;

-- Registrar número de testes (plano pgTAP)
SELECT plan(12);


-- =============================================================================
-- SETUP: Criar dados de teste isolados
-- Usamos UUIDs fixos para reprodutibilidade
-- =============================================================================

-- UUIDs dos tenants de teste
\set tenant_a_id '\'a0000000-0000-0000-0000-000000000001\''
\set tenant_b_id '\'b0000000-0000-0000-0000-000000000002\''

-- UUIDs dos usuários de teste (precisam existir em auth.users para FK)
-- Em ambiente de teste do Supabase, auth.users é acessível
\set user_a_id '\'a1000000-0000-0000-0000-000000000001\''
\set user_b_id '\'b1000000-0000-0000-0000-000000000002\''

-- Setup: inserir tenants via service_role (sem RLS)
SET LOCAL ROLE service_role;

INSERT INTO tenants (id, slug, name, plan)
VALUES
  (:tenant_a_id, 'tenant-a-test', 'Escritório Alpha Teste', 'free'),
  (:tenant_b_id, 'tenant-b-test', 'Escritório Beta Teste', 'free')
ON CONFLICT (id) DO NOTHING;

-- Inserir membros dos tenants (owner de cada tenant)
-- Nota: em testes pgTAP, auth.users pode não ter estes UUIDs.
-- Os INSERTs em tenant_members usam ON CONFLICT DO NOTHING para idempotência.
INSERT INTO tenant_members (id, tenant_id, user_id, role, accepted_at)
VALUES
  (gen_random_uuid(), :tenant_a_id, :user_a_id, 'owner', now()),
  (gen_random_uuid(), :tenant_b_id, :user_b_id, 'owner', now())
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- Inserir monitored_cases em cada tenant para testar isolamento
INSERT INTO monitored_cases (id, tenant_id, cnj, tribunal, status)
VALUES
  ('a2000000-0000-0000-0000-000000000001', :tenant_a_id, '0000001-00.2024.0.00.0000', 'TJSP', 'ativo'),
  ('b2000000-0000-0000-0000-000000000001', :tenant_b_id, '0000002-00.2024.0.00.0000', 'TJRJ', 'ativo')
ON CONFLICT (tenant_id, cnj) DO NOTHING;

-- Inserir tenant_members adicionais para testar cross-tenant em tenant_members
-- (já feito acima, os dois owners)


-- =============================================================================
-- TESTE 1: service_role vê TODOS os tenants (bypass RLS)
-- =============================================================================
SELECT is(
  (SELECT COUNT(*)::INT FROM tenants WHERE id IN (:tenant_a_id, :tenant_b_id)),
  2,
  'service_role: SELECT em tenants retorna ambos os tenants (bypass RLS)'
);


-- =============================================================================
-- TESTE 2: service_role vê TODOS os monitored_cases (bypass RLS)
-- =============================================================================
SELECT is(
  (SELECT COUNT(*)::INT FROM monitored_cases
   WHERE tenant_id IN (:tenant_a_id, :tenant_b_id)),
  2,
  'service_role: SELECT em monitored_cases retorna casos de ambos os tenants'
);


-- =============================================================================
-- TESTE 3: plan_limits é público — SELECT sem autenticação retorna todos os planos
-- =============================================================================

-- Simular usuário sem JWT (anon role)
SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claims" TO '{}';

SELECT is(
  (SELECT COUNT(*)::INT FROM plan_limits),
  5,
  'plan_limits: leitura pública retorna os 5 planos sem autenticação'
);

-- Voltar para service_role para próximos testes
SET LOCAL ROLE service_role;


-- =============================================================================
-- TESTE 4: Tenant A NÃO vê monitored_cases do tenant B
-- Simula JWT do usuário A com tenant_id = tenant_a_id
-- =============================================================================

-- Configurar JWT como usuário do tenant A
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub": "a1000000-0000-0000-0000-000000000001",
    "tenant_id": "a0000000-0000-0000-0000-000000000001",
    "role": "owner"}';

SELECT is(
  (SELECT COUNT(*)::INT FROM monitored_cases
   WHERE id = 'b2000000-0000-0000-0000-000000000001'),
  0,
  'Tenant A: SELECT em monitored_cases do tenant B retorna 0 rows (RLS bloqueio)'
);


-- =============================================================================
-- TESTE 5: Tenant A vê apenas os próprios monitored_cases
-- =============================================================================
SELECT is(
  (SELECT COUNT(*)::INT FROM monitored_cases),
  1,
  'Tenant A: SELECT em monitored_cases retorna apenas casos do próprio tenant'
);


-- =============================================================================
-- TESTE 6: Tenant A NÃO vê tenant_members do tenant B
-- =============================================================================
SELECT is(
  (SELECT COUNT(*)::INT FROM tenant_members
   WHERE tenant_id = :tenant_b_id),
  0,
  'Tenant A: SELECT em tenant_members filtrado por tenant B retorna 0 rows'
);


-- =============================================================================
-- TESTE 7: Tenant A vê apenas os próprios tenant_members
-- =============================================================================
SELECT is(
  (SELECT COUNT(*)::INT FROM tenant_members),
  1,
  'Tenant A: SELECT em tenant_members retorna apenas membros do próprio tenant'
);


-- =============================================================================
-- TESTE 8: INSERT cross-tenant em monitored_cases é rejeitado pela policy
-- Tenant A tenta inserir caso com tenant_id = tenant_b_id
-- =============================================================================
SELECT throws_ok(
  $$
    INSERT INTO monitored_cases (tenant_id, cnj, status)
    VALUES ('b0000000-0000-0000-0000-000000000002', '9999999-00.2024.0.00.0000', 'ativo')
  $$,
  'Tenant A: INSERT em monitored_cases com tenant_id do tenant B é rejeitado (RLS)'
);


-- =============================================================================
-- TESTE 9: Tenant B NÃO vê dados do tenant A (simetria de isolamento)
-- Configurar JWT do tenant B
-- =============================================================================
SET LOCAL "request.jwt.claims" TO
  '{"sub": "b1000000-0000-0000-0000-000000000002",
    "tenant_id": "b0000000-0000-0000-0000-000000000002",
    "role": "owner"}';

SELECT is(
  (SELECT COUNT(*)::INT FROM monitored_cases
   WHERE id = 'a2000000-0000-0000-0000-000000000001'),
  0,
  'Tenant B: SELECT em monitored_cases do tenant A retorna 0 rows (isolamento simétrico)'
);


-- =============================================================================
-- TESTE 10: Tenant B vê apenas o próprio tenant na tabela tenants
-- =============================================================================
SELECT is(
  (SELECT COUNT(*)::INT FROM tenants),
  1,
  'Tenant B: SELECT em tenants retorna apenas o próprio tenant'
);


-- =============================================================================
-- TESTE 11: UPDATE cross-tenant em tenants é rejeitado
-- Tenant B tenta atualizar o tenant A
-- =============================================================================
SELECT throws_ok(
  $$
    UPDATE tenants SET name = 'Hackeado'
    WHERE id = 'a0000000-0000-0000-0000-000000000001'
  $$,
  'Tenant B: UPDATE em tenants do tenant A é rejeitado (RLS)'
);


-- =============================================================================
-- TESTE 12: auth.tenant_id() com JWT sem claim retorna NULL
-- =============================================================================
SET LOCAL "request.jwt.claims" TO '{"sub": "no-tenant-user", "role": "authenticated"}';

SELECT is(
  auth.tenant_id(),
  NULL::UUID,
  'auth.tenant_id(): JWT sem claim tenant_id retorna NULL'
);


-- =============================================================================
-- CLEANUP: Remover dados de teste (ROLLBACK os fará de qualquer forma)
-- Listados aqui para documentação — o ROLLBACK final descarta tudo.
-- =============================================================================

-- ROLLBACK desfaz: tenants de teste, tenant_members, monitored_cases inseridos
-- e todas as alterações de configuração (SET LOCAL).


-- Finalizar testes pgTAP
SELECT * FROM finish();

ROLLBACK;
