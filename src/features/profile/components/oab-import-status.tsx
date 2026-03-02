import { Badge } from '@/components/ui/badge'
import { Clock, CheckCircle, XCircle, Loader2, Plus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface OabImport {
  id: string
  oab_number: string
  oab_uf: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'partial'
  cases_found: number
  cases_imported: number
  created_at: string
}

const STATUS_CONFIG = {
  pending:   { label: 'Aguardando',  icon: Clock,       variant: 'secondary' as const },
  running:   { label: 'Importando',  icon: Loader2,     variant: 'default' as const },
  completed: { label: 'Concluído',   icon: CheckCircle, variant: 'outline' as const },
  partial:   { label: 'Parcial',     icon: CheckCircle, variant: 'outline' as const },
  failed:    { label: 'Falhou',      icon: XCircle,     variant: 'destructive' as const },
}

export function OabImportStatus({ imports }: { imports: OabImport[] }) {
  if (imports.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        <Plus size={20} className="mx-auto mb-2 opacity-40" />
        Nenhuma OAB cadastrada. Adicione sua OAB para importar processos automaticamente.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {imports.map((imp) => {
        const cfg = STATUS_CONFIG[imp.status] ?? STATUS_CONFIG.pending
        const Icon = cfg.icon
        const isRunning = imp.status === 'pending' || imp.status === 'running'

        return (
          <div key={imp.id} className="rounded-lg border bg-card p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Icon size={16} className={isRunning ? 'animate-spin text-primary' : 'text-muted-foreground'} />
              <div>
                <p className="font-mono text-sm font-medium">
                  OAB {imp.oab_number}/{imp.oab_uf}
                </p>
                {(imp.cases_found > 0 || imp.status === 'completed') && (
                  <p className="text-xs text-muted-foreground">
                    {imp.cases_imported} de {imp.cases_found} processos importados
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(imp.created_at), { addSuffix: true, locale: ptBR })}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
