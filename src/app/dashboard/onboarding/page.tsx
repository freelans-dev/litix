import type { Metadata } from 'next'
import { getTenantContext } from '@/lib/auth'
import { createTenantClient } from '@/lib/supabase/tenant'
import { redirect } from 'next/navigation'
import { OABField } from '@/features/profile/components/oab-field'
import { Sparkles } from 'lucide-react'

export const metadata: Metadata = { title: 'Bem-vindo ao Litix' }

export default async function OnboardingPage() {
  const ctx = await getTenantContext()
  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)

  // If the member already has imports, redirect to dashboard
  const { count } = await supabase
    .from('oab_imports')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', ctx.tenantId)

  if ((count ?? 0) > 0) redirect('/dashboard')

  // max_oab_per_member per plan (Free/Solo: 1, Escritório: 3, Pro: 5, Enterprise: -1)
  const MAX_OAB: Record<string, number> = {
    free: 1, solo: 1, escritorio: 3, pro: 5, enterprise: -1,
  }
  const maxOab = MAX_OAB[ctx.plan] ?? 1

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10">
            <Sparkles size={28} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Bem-vindo ao Litix!</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Vamos importar seus processos automaticamente. Informe seu número de OAB.
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="font-semibold">Cadastre sua OAB</h2>
            <p className="text-sm text-muted-foreground">
              O Litix vai buscar todos os processos onde você aparece como advogado no DataJud
              e demais fontes judiciais.
            </p>
          </div>
          <OABField maxOab={maxOab} />
        </div>

        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground text-center">
          Você pode adicionar até {maxOab === -1 ? 'ilimitadas' : maxOab} OAB{maxOab !== 1 ? 's' : ''} no plano {ctx.plan}.{' '}
          <a href="/pricing" className="text-primary hover:underline">Ver planos</a>
        </div>
      </div>
    </div>
  )
}
