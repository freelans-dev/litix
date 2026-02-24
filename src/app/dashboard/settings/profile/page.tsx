import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth'
import { OABImportForm } from '@/features/cases/components/oab-import-form'
import { Badge } from '@/components/ui/badge'
import { FileText, CheckCircle, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const metadata: Metadata = { title: 'Importar OAB — Litix' }

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const ctx = await getTenantContext()
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', ctx.userId)
    .single()

  // Get OAB import history
  const { data: imports } = await supabase
    .from('oab_imports' as 'monitored_cases') // typed workaround
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .limit(5)
    .then(({ data, error }) => {
      // Table may not exist in current DB state — safe fallback
      if (error) return { data: null }
      return { data }
    })

  const statusLabel: Record<string, string> = {
    pending: 'Pendente',
    running: 'Em andamento',
    completed: 'Concluído',
    failed: 'Falhou',
  }

  const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'secondary',
    running: 'default',
    completed: 'outline',
    failed: 'destructive',
  }

  return (
    <div className="p-6 max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Perfil e OAB</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Importe seus processos automaticamente pelo número de OAB.
        </p>
      </div>

      {/* Profile info */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold">Informações da conta</h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs mb-0.5">Nome</p>
            <p className="font-medium">{profile?.full_name ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-0.5">Email</p>
            <p className="font-medium">{profile?.email ?? '—'}</p>
          </div>
        </div>
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

        <OABImportForm plan={ctx.plan} />

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

      {/* Import history */}
      {imports && imports.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Clock size={16} />
            Histórico de importações
          </h2>
          <div className="space-y-2">
            {imports.map((imp: Record<string, unknown>) => (
              <div
                key={imp.id as string}
                className="rounded-lg border bg-card p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">
                      OAB {imp.oab_number as string}/{imp.oab_state as string}
                    </span>
                    <Badge variant={statusVariant[(imp.status as string)] ?? 'secondary'}>
                      {statusLabel[(imp.status as string)] ?? imp.status}
                    </Badge>
                  </div>
                  {imp.total_found != null && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {imp.total_imported as number} de {imp.total_found as number} processos importados
                    </p>
                  )}
                </div>
                <div className="text-right text-xs text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(imp.created_at as string), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
