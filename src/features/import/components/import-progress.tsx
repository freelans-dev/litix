'use client'
import { useEffect, useState } from 'react'
import { useImportProgress } from '@/hooks/use-import-progress'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

interface ImportProgressProps {
  importId: string
}

function useElapsedTime(startedAt: string | null | undefined): string {
  const [elapsed, setElapsed] = useState('')

  useEffect(() => {
    if (!startedAt) return

    const update = () => {
      const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
      const m = Math.floor(diff / 60)
      const s = diff % 60
      setElapsed(m > 0 ? `${m}m ${s}s` : `${s}s`)
    }

    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [startedAt])

  return elapsed
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Aguardando',
  running: 'Importando',
  completed: 'Concluído',
  failed: 'Erro',
}

const STATUS_VARIANTS: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  pending: 'secondary',
  running: 'default',
  completed: 'outline',
  failed: 'destructive',
}

export function ImportProgress({ importId }: ImportProgressProps) {
  const progress = useImportProgress(importId)
  const elapsed = useElapsedTime(progress?.started_at)

  if (!progress) {
    return (
      <div className="flex items-center gap-3 text-muted-foreground py-8 justify-center">
        <Loader2 className="animate-spin size-5" />
        <span className="text-sm">Carregando status da importação...</span>
      </div>
    )
  }

  const { status, cases_found, cases_imported, cases_deduplicated, error } = progress
  const percent =
    cases_found > 0 ? Math.min(100, Math.round((cases_imported / cases_found) * 100)) : 0

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {status === 'running' && (
            <Loader2 className="animate-spin size-4 text-primary" />
          )}
          {status === 'completed' && (
            <CheckCircle2 className="size-4 text-green-600" />
          )}
          {status === 'failed' && (
            <XCircle className="size-4 text-destructive" />
          )}
          {status === 'pending' && (
            <Loader2 className="animate-spin size-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">
            {status === 'pending' && 'Aguardando início...'}
            {status === 'running' && 'Importando processos...'}
            {status === 'completed' && 'Importação concluída'}
            {status === 'failed' && 'Erro na importação'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_VARIANTS[status] ?? 'secondary'}>
            {STATUS_LABELS[status] ?? status}
          </Badge>
          {elapsed && status === 'running' && (
            <span className="text-xs text-muted-foreground">{elapsed}</span>
          )}
        </div>
      </div>

      {/* Progress bar — only for running/completed */}
      {(status === 'running' || status === 'completed') && (
        <div className="space-y-1.5">
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{percent}%</span>
            <span>
              {cases_imported} / {cases_found} processos
            </span>
          </div>
        </div>
      )}

      {/* Counters */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-3 text-center space-y-0.5">
          <p className="text-2xl font-bold tabular-nums">{cases_found}</p>
          <p className="text-xs text-muted-foreground">Encontrados</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center space-y-0.5">
          <p className="text-2xl font-bold tabular-nums">{cases_imported}</p>
          <p className="text-xs text-muted-foreground">Importados</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center space-y-0.5">
          <p className="text-2xl font-bold tabular-nums">{cases_deduplicated}</p>
          <p className="text-xs text-muted-foreground">Deduplicados</p>
        </div>
      </div>

      {/* Error message */}
      {status === 'failed' && error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  )
}
