'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Download, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

const ESTADOS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

const schema = z.object({
  oab_number: z
    .string()
    .min(3, 'Número OAB inválido')
    .regex(/^\d+$/, 'Apenas números'),
  oab_state: z.string().length(2, 'Selecione o estado'),
})

type FormData = z.infer<typeof schema>

type ImportRecord = {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  total_found: number | null
  total_imported: number | null
  oab_number: string
  oab_uf: string
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Aguardando...',
  running: 'Importando processos...',
  completed: 'Importação concluída!',
  failed: 'Falha na importação',
}

export function OABImportForm({ plan }: { plan: string }) {
  const [loading, setLoading] = useState(false)
  const [importRecord, setImportRecord] = useState<ImportRecord | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isFree = plan === 'free'

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  // Stop polling when component unmounts or import finishes
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  function startPolling(importId: string) {
    if (pollingRef.current) clearInterval(pollingRef.current)

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/v1/oab')
        if (!res.ok) return
        const json = await res.json()
        const record = (json.data as ImportRecord[]).find((r) => r.id === importId)
        if (!record) return

        setImportRecord(record)

        if (record.status === 'completed' || record.status === 'failed') {
          if (pollingRef.current) clearInterval(pollingRef.current)
        }
      } catch {
        // ignore polling errors
      }
    }, 3000)
  }

  async function onSubmit(data: FormData) {
    setLoading(true)

    const res = await fetch('/api/v1/oab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? 'Erro ao iniciar importação')
      setLoading(false)
      return
    }

    const created: ImportRecord = await res.json()
    setImportRecord(created)
    toast.success('Importação iniciada!')
    setLoading(false)
    startPolling(created.id)
  }

  if (isFree) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30 p-4">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          Importação por OAB disponível no plano Solo ou superior
        </p>
        <p className="text-sm text-amber-700 dark:text-amber-300/80 mt-1">
          Faça upgrade para importar todos os seus processos automaticamente.
        </p>
        <Button size="sm" variant="outline" className="mt-3" asChild>
          <Link href="/pricing">Ver planos</Link>
        </Button>
      </div>
    )
  }

  if (importRecord) {
    const isRunning = importRecord.status === 'pending' || importRecord.status === 'running'
    const isCompleted = importRecord.status === 'completed'
    const isFailed = importRecord.status === 'failed'

    const progress =
      importRecord.total_found && importRecord.total_found > 0 && importRecord.total_imported != null
        ? Math.round((importRecord.total_imported / importRecord.total_found) * 100)
        : null

    return (
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          {isRunning && <Loader2 size={18} className="animate-spin text-primary shrink-0" />}
          {isCompleted && <CheckCircle size={18} className="text-success shrink-0" />}
          {isFailed && <XCircle size={18} className="text-destructive shrink-0" />}
          <div className="flex-1">
            <p className="font-medium text-sm">
              OAB {importRecord.oab_number}/{importRecord.oab_uf}
            </p>
            <p className="text-xs text-muted-foreground">
              {STATUS_LABELS[importRecord.status]}
            </p>
          </div>
        </div>

        {isRunning && importRecord.total_found != null && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{importRecord.total_imported ?? 0} de {importRecord.total_found} processos importados</span>
              {progress != null && <span>{progress}%</span>}
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progress ?? 0}%` }}
              />
            </div>
          </div>
        )}

        {isCompleted && importRecord.total_found != null && (
          <p className="text-sm text-muted-foreground">
            {importRecord.total_imported} processos importados de {importRecord.total_found} encontrados.
          </p>
        )}

        {(isCompleted || isFailed) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setImportRecord(null)
              if (pollingRef.current) clearInterval(pollingRef.current)
            }}
          >
            Importar outra OAB
          </Button>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1 space-y-2">
          <Label htmlFor="oab_number">Número OAB</Label>
          <Input
            id="oab_number"
            placeholder="123456"
            className="font-mono"
            {...register('oab_number')}
          />
          {errors.oab_number && (
            <p className="text-xs text-destructive">{errors.oab_number.message}</p>
          )}
        </div>
        <div className="w-28 space-y-2">
          <Label htmlFor="oab_state">Estado</Label>
          <select
            id="oab_state"
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            {...register('oab_state')}
          >
            <option value="">UF</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
          {errors.oab_state && (
            <p className="text-xs text-destructive">{errors.oab_state.message}</p>
          )}
        </div>
      </div>

      <Button type="submit" disabled={loading} className="gap-2">
        {loading ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            Iniciando importação...
          </>
        ) : (
          <>
            <Download size={15} />
            Importar processos da OAB
          </>
        )}
      </Button>
    </form>
  )
}
