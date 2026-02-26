import { getTenantContext } from '@/lib/auth'
import { createTenantClient } from '@/lib/supabase/tenant'
import { DashboardShell } from '@/components/layout/dashboard-shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getTenantContext()
  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)

  const [{ data: tenant }, { data: profile }, { count: unreadAlerts }] = await Promise.all([
    supabase.from('tenants').select('name').eq('id', ctx.tenantId).single(),
    supabase.from('profiles').select('full_name').eq('id', ctx.userId).single(),
    supabase
      .from('alerts')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', ctx.tenantId)
      .eq('read', false),
  ])

  return (
    <DashboardShell
      userName={profile?.full_name ?? 'Usuário'}
      tenantName={tenant?.name ?? 'Meu Escritório'}
      unreadAlerts={unreadAlerts ?? 0}
      plan={ctx.plan}
    >
      {children}
    </DashboardShell>
  )
}
