'use client'
import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useImportProgress } from '@/hooks/use-import-progress'
import { ImportProgress } from '@/features/import/components/import-progress'
import { ImportResultsTable } from '@/features/import/components/import-results-table'
import { ImportSummary } from '@/features/import/components/import-summary'
import { importService, type ImportedCase } from '@/features/import/services/import.service'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

type PageState = 'loading' | 'importing' | 'reviewing' | 'confirmed' | 'failed'

interface ConfirmedData {
  imported: number
  tribunais: number
}

export default function ImportResultPage({
  params,
}: {
  params: Promise<{ importId: string }>
}) {
  const { importId } = use(params)
  const router = useRouter()

  const progress = useImportProgress(importId)

  const [pageState, setPageState] = useState<PageState>('loading')
  const [cases, setCases] = useState<ImportedCase[]>([])
  const [confirming, setConfirming] = useState(false)
  const [confirmedData, setConfirmedData] = useState<ConfirmedData | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Transition page state based on import progress
  useEffect(() => {
    if (!progress) return

    if (progress.status === 'pending' || progress.status === 'running') {
      setPageState('importing')
    } else if (progress.status === 'failed') {
      setPageState('failed')
    } else if (progress.status === 'completed') {
      if (pageState !== 'reviewing' && pageState !== 'confirmed') {
        // Fetch the results now that import is done
        setPageState('loading')
        importService
          .getResults(importId)
          .then((res) => {
            setCases(res.data)
            setPageState('reviewing')
          })
          .catch((err: unknown) => {
            setFetchError(
              err instanceof Error ? err.message : 'Erro ao carregar resultados'
            )
            setPageState('reviewing')
          })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress?.status])

  const handleRemoveCase = useCallback(
    async (caseId: string) => {
      await importService.removeCase(importId, caseId)
      setCases((prev) => prev.filter((c) => c.id !== caseId))
    },
    [importId]
  )

  const handleConfirm = useCallback(async () => {
    setConfirming(true)
    try {
      const res = await importService.confirmImport(importId)
      const uniqueTribunais = new Set(cases.map((c) => c.tribunal).filter(Boolean)).size
      setConfirmedData({
        imported: res.cases_count,
        tribunais: uniqueTribunais,
      })
      setPageState('confirmed')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao confirmar importação'
      setFetchError(msg)
    } finally {
      setConfirming(false)
    }
  }, [importId, cases])

  const handleGoToDashboard = () => {
    router.push('/dashboard/cases')
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Resultado da Importação</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Revise os processos encontrados antes de confirmar o monitoramento
        </p>
      </div>

      {/* Error banner (non-fatal) */}
      {fetchError && (
        <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3">
          <AlertCircle className="size-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-sm text-destructive">{fetchError}</p>
        </div>
      )}

      {/* Loading spinner */}
      {pageState === 'loading' && !progress && (
        <div className="rounded-lg border bg-card p-8">
          <div className="flex items-center justify-center gap-3 text-muted-foreground">
            <div className="size-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
            <span className="text-sm">Carregando...</span>
          </div>
        </div>
      )}

      {/* Import in progress */}
      {pageState === 'importing' && (
        <div className="rounded-lg border bg-card p-6">
          <ImportProgress importId={importId} />
        </div>
      )}

      {/* Fetching results after completion */}
      {pageState === 'loading' && progress?.status === 'completed' && (
        <div className="rounded-lg border bg-card p-8">
          <div className="flex items-center justify-center gap-3 text-muted-foreground">
            <div className="size-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
            <span className="text-sm">Carregando processos importados...</span>
          </div>
        </div>
      )}

      {/* Review table */}
      {pageState === 'reviewing' && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-6 space-y-2">
            <ImportProgress importId={importId} />
          </div>
          <ImportResultsTable
            cases={cases}
            onRemove={handleRemoveCase}
            onConfirm={handleConfirm}
            confirming={confirming}
          />
        </div>
      )}

      {/* Success summary */}
      {pageState === 'confirmed' && confirmedData && (
        <ImportSummary
          imported={confirmedData.imported}
          tribunais={confirmedData.tribunais}
          onGoToDashboard={handleGoToDashboard}
        />
      )}

      {/* Failed state */}
      {pageState === 'failed' && (
        <div className="rounded-lg border border-destructive/30 bg-card p-8 text-center space-y-4">
          <div className="size-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertCircle className="size-7 text-destructive" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Erro na importação</h2>
            {progress?.error && (
              <p className="text-sm text-muted-foreground mt-1">{progress.error}</p>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/settings/profile')}
          >
            Tentar novamente
          </Button>
        </div>
      )}
    </div>
  )
}
