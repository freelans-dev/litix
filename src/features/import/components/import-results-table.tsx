'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ProviderBadge } from '@/features/import/components/provider-badge'
import { formatCNJ } from '@/lib/crypto'
import type { ImportedCase } from '@/features/import/services/import.service'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const PAGE_SIZE = 20

interface ImportResultsTableProps {
  cases: ImportedCase[]
  onRemove: (caseId: string) => Promise<void>
  onConfirm: () => void
  confirming: boolean
}

export function ImportResultsTable({
  cases,
  onRemove,
  onConfirm,
  confirming,
}: ImportResultsTableProps) {
  const [page, setPage] = useState(1)
  const [removing, setRemoving] = useState<string | null>(null)

  const totalPages = Math.max(1, Math.ceil(cases.length / PAGE_SIZE))
  const start = (page - 1) * PAGE_SIZE
  const pageCases = cases.slice(start, start + PAGE_SIZE)

  const handleRemove = async (caseId: string) => {
    setRemoving(caseId)
    try {
      await onRemove(caseId)
    } finally {
      setRemoving(null)
    }
  }

  if (cases.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-dashed bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">Nenhum processo importado</p>
        </div>
        <div className="flex justify-end">
          <Button onClick={onConfirm} disabled={confirming}>
            {confirming ? 'Confirmando...' : 'Confirmar importação (0 processos)'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Processo (CNJ)
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">
                Tribunal
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">
                Classe
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">
                Provider
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden xl:table-cell">
                Distribuição
              </th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pageCases.map((c) => (
              <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-mono text-xs cnj">{formatCNJ(c.cnj)}</span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                  {c.tribunal ?? '—'}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell max-w-[200px] truncate">
                  {c.classe ?? '—'}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <ProviderBadge provider={c.provider} />
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground hidden xl:table-cell">
                  {c.data_distribuicao
                    ? format(new Date(c.data_distribuicao), 'dd/MM/yyyy', { locale: ptBR })
                    : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleRemove(c.id)}
                    disabled={removing === c.id || confirming}
                    className="inline-flex items-center justify-center size-7 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Remover processo"
                  >
                    <X className="size-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination + confirm footer */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="inline-flex items-center justify-center size-8 rounded-md border hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Página anterior"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="inline-flex items-center justify-center size-8 rounded-md border hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Próxima página"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}

        {totalPages <= 1 && <div />}

        <Button onClick={onConfirm} disabled={confirming}>
          {confirming
            ? 'Confirmando...'
            : `Confirmar importação (${cases.length} processo${cases.length !== 1 ? 's' : ''})`}
        </Button>
      </div>
    </div>
  )
}
