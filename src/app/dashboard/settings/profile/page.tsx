import type { Metadata } from 'next'
import { createTenantClient } from '@/lib/supabase/tenant'
import { getTenantContext } from '@/lib/auth'
import { ProfileForm } from '@/features/profile/components/profile-form'
import { OABField } from '@/features/profile/components/oab-field'
import { OabImportStatus } from '@/features/profile/components/oab-import-status'
import { FileText, User } from 'lucide-react'

export const metadata: Metadata = { title: 'Perfil — Litix' }

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const ctx = await getTenantContext()
  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, phone')
    .eq('id', ctx.userId)
    .single()

  // Get OAB import history
  const { data: rawImports } = await supabase
    .from('oab_imports')
    .select('id, oab_number, oab_uf, status, cases_found, cases_imported, created_at')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .limit(10)
    .then(({ data, error }) => {
      if (error) return { data: null }
      return { data }
    })

  const imports = (rawImports ?? []) as Array<{
    id: string
    oab_number: string
    oab_uf: string
    status: 'pending' | 'running' | 'completed' | 'failed' | 'partial'
    cases_found: number
    cases_imported: number
    created_at: string
  }>

  // Determine max OAB per member from plan
  const { createServiceClient } = await import('@/lib/supabase/service')
  const service = createServiceClient()
  const { data: planLimit } = await service
    .from('plan_limits')
    .select('max_oab_per_member')
    .eq('plan', ctx.plan)
    .single()

  const maxOab = planLimit?.max_oab_per_member ?? 1

  return (
    <div className="p-6 max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Perfil e OAB</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie seus dados pessoais e importe seus processos pelo número de OAB.
        </p>
      </div>

      {/* Profile form */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <User size={15} />
          Informações da conta
        </h2>
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Email:</span> {profile?.email ?? '—'}
        </div>
        <ProfileForm
          defaultValues={{
            full_name: profile?.full_name ?? '',
            phone: profile?.phone,
          }}
        />
      </div>

      {/* OAB Import */}
      <div className="space-y-4">
        <div>
          <h2 className="font-semibold flex items-center gap-2">
            <FileText size={16} />
            Importação por OAB
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Informe seu número de OAB para importar automaticamente todos os processos
            associados ao seu registro. O Litix consulta todos os tribunais via DataJud e
            outros providers.
          </p>
        </div>

        {ctx.plan === 'free' ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30 p-4">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Importação por OAB disponível no plano Solo ou superior
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300/80 mt-1">
              Faça upgrade para importar todos os seus processos automaticamente.
            </p>
            <a
              href="/pricing"
              className="inline-flex items-center mt-3 text-sm font-medium text-amber-800 dark:text-amber-200 underline underline-offset-2 hover:no-underline"
            >
              Ver planos
            </a>
          </div>
        ) : (
          <OABField maxOab={maxOab} />
        )}

        {/* How it works */}
        <div className="rounded-lg border border-dashed bg-muted/20 p-5 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Como funciona
          </p>
          <div className="space-y-2">
            {[
              'Você informa o número OAB e o estado (ex: 123456/SP)',
              'O Litix consulta o DataJud e busca processos onde você aparece como advogado',
              'Todos os processos encontrados são cadastrados e o monitoramento é ativado',
              'Você recebe um email quando a importação estiver completa',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-muted-foreground">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Import status / history */}
      <div className="space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <FileText size={16} />
          Histórico de importações
        </h2>
        <OabImportStatus imports={imports} />
      </div>
    </div>
  )
}
