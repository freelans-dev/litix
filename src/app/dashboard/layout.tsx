import { getTenantContext } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { DashboardShell } from '@/components/layout/dashboard-shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getTenantContext()
  const service = createServiceClient()

  type TenantRow = { name: string }
  type ProfileRow = { full_name: string | null }

  const [{ data: tenant }, { data: profile }, { count: unreadAlerts }] = await Promise.all([
    service.from('tenants').select('name').eq('id', ctx.tenantId).single<TenantRow>(),
    service.from('profiles').select('full_name').eq('id', ctx.userId).single<ProfileRow>(),
    service
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
