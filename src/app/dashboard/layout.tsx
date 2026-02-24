import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/layout/dashboard-shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const metadata = (user.app_metadata ?? {}) as Record<string, string>

  const { count: unreadAlerts } = await supabase
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .eq('read', false)

  const tenantId = metadata.tenant_id
  type TenantRow = { name: string }
  type ProfileRow = { full_name: string | null }

  const { data: tenant } = tenantId
    ? await supabase.from('tenants').select('name').eq('id', tenantId).single<TenantRow>()
    : { data: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single<ProfileRow>()

  return (
    <DashboardShell
      userName={profile?.full_name ?? user.email ?? 'Usuário'}
      tenantName={tenant?.name ?? 'Meu Escritório'}
      unreadAlerts={unreadAlerts ?? 0}
      plan={metadata.plan ?? 'free'}
    >
      {children}
    </DashboardShell>
  )
}
