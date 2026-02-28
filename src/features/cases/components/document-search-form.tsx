'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Search, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

const schema = z.object({
  document_value: z
    .string()
    .min(11, 'Digite o CPF (11 dígitos) ou CNPJ (14 dígitos)')
    .max(14, 'Máximo 14 dígitos')
    .regex(/^\d+$/, 'Apenas números'),
}).refine(
  (data) => data.document_value.length === 11 || data.document_value.length === 14,
  { message: 'CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos', path: ['document_value'] }
)

type FormData = z.infer<typeof schema>

type SearchRecord = {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  cases_found: number
  cases_imported: number
  cases_deduplicated: number
  document_type: string
  document_value: string
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Aguardando...',
  running: 'Buscando processos...',
  completed: 'Busca concluída!',
  failed: 'Falha na busca',
}

interface DocumentSearchFormProps {
  plan: string
  clientId?: string
  clientName?: string
}

export function DocumentSearchForm({ plan, clientId, clientName }: DocumentSearchFormProps) {
  const [loading, setLoading] = useState(false)
  const [searchRecord, setSearchRecord] = useState<SearchRecord | null>(null)
  const [pollingId, setPollingId] = useState<string | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isFree = plan === 'free'

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  // Start/stop polling via effect (avoids ref access during render)
  useEffect(() => {
    if (!pollingId) return

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/v1/document-search')
        if (!res.ok) return
        const json = await res.json()
        const record = (json.data as SearchRecord[]).find((r) => r.id === pollingId)
        if (!record) return

        setSearchRecord(record)

        if (record.status === 'completed' || record.status === 'failed') {
          setPollingId(null)
        }
      } catch {
        // ignore polling errors
      }
    }, 3000)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [pollingId])

  async function onSubmit(data: FormData) {
    setLoading(true)

    const digits = data.document_value.replace(/\D/g, '')
    const documentType = digits.length === 11 ? 'cpf' : 'cnpj'

    const res = await fetch('/api/v1/document-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_type: documentType,
        document_value: digits,
        client_id: clientId,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? 'Erro ao iniciar busca')
      setLoading(false)
      return
    }

    const created: SearchRecord = await res.json()
    setSearchRecord(created)
    toast.success('Busca iniciada!')
    setLoading(false)
    setPollingId(created.id)
  }

  if (isFree) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30 p-4">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          Busca por CPF/CNPJ disponível no plano Solo ou superior
        </p>
        <p className="text-sm text-amber-700 dark:text-amber-300/80 mt-1">
          Faça upgrade para buscar todos os processos de uma pessoa ou empresa automaticamente.
        </p>
        <Button size="sm" variant="outline" className="mt-3" asChild>
          <Link href="/pricing">Ver planos</Link>
        </Button>
      </div>
    )
  }

  if (searchRecord) {
    const isRunning = searchRecord.status === 'pending' || searchRecord.status === 'running'
    const isCompleted = searchRecord.status === 'completed'
    const isFailed = searchRecord.status === 'failed'

    const progress =
      searchRecord.cases_found > 0 && searchRecord.cases_imported != null
        ? Math.round((searchRecord.cases_imported / searchRecord.cases_found) * 100)
        : null

    const docLabel = searchRecord.document_type === 'cpf' ? 'CPF' : 'CNPJ'

    return (
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          {isRunning && <Loader2 size={18} className="animate-spin text-primary shrink-0" />}
          {isCompleted && <CheckCircle size={18} className="text-success shrink-0" />}
          {isFailed && <XCircle size={18} className="text-destructive shrink-0" />}
          <div className="flex-1">
            <p className="font-medium text-sm">
              {docLabel} {searchRecord.document_value}
              {clientName && <span className="text-muted-foreground font-normal"> — {clientName}</span>}
            </p>
            <p className="text-xs text-muted-foreground">
              {STATUS_LABELS[searchRecord.status]}
            </p>
          </div>
        </div>

        {isRunning && searchRecord.cases_found > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{searchRecord.cases_imported} de {searchRecord.cases_found} processos importados</span>
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

        {isCompleted && (
          <p className="text-sm text-muted-foreground">
            {searchRecord.cases_imported} processos importados de {searchRecord.cases_found} encontrados.
            {searchRecord.cases_deduplicated > 0 && (
              <span> ({searchRecord.cases_deduplicated} já existiam)</span>
            )}
          </p>
        )}

        {(isCompleted || isFailed) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchRecord(null)
              setPollingId(null)
            }}
          >
            Nova busca
          </Button>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {clientName && (
        <p className="text-sm text-muted-foreground">
          Buscar todos os processos de <span className="font-medium text-foreground">{clientName}</span>
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="document_value">CPF ou CNPJ</Label>
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="document_value"
            className="pl-9 font-mono"
            placeholder="Digite o CPF (11 dígitos) ou CNPJ (14 dígitos)"
            maxLength={14}
            autoFocus={!clientId}
            {...register('document_value')}
          />
        </div>
        {errors.document_value && (
          <p className="text-xs text-destructive">{errors.document_value.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          O Litix buscará todos os processos onde esta pessoa ou empresa é parte.
        </p>
      </div>

      <Button type="submit" disabled={loading} className="gap-2">
        {loading ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            Iniciando busca...
          </>
        ) : (
          <>
            <Search size={15} />
            Buscar processos
          </>
        )}
      </Button>
    </form>
  )
}
