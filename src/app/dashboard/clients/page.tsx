import type { Metadata } from 'next'
import { createTenantClient } from '@/lib/supabase/tenant'
import { getTenantContext } from '@/lib/auth'
import { ClientsPanel } from '@/features/clients/components/clients-panel'
import { Building2 } from 'lucide-react'

export const metadata: Metadata = { title: 'Clientes — Litix' }
export const dynamic = 'force-dynamic'

export default async function ClientsPage() {
  const ctx = await getTenantContext()
  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)

  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('is_active', true)
    .order('name', { ascending: true })

  const canEdit = ctx.role === 'owner' || ctx.role === 'admin' || ctx.role === 'member'

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 size={20} />
            Clientes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os clientes do seu escritório e veja os processos vinculados.
          </p>
        </div>
      </div>

      <ClientsPanel initialClients={clients ?? []} canEdit={canEdit} />
    </div>
  )
}
