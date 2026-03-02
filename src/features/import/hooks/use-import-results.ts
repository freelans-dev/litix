'use client'
import { useState, useEffect, useCallback } from 'react'
import { importService, type ImportedCase } from '@/features/import/services/import.service'

interface UseImportResultsReturn {
  cases: ImportedCase[]
  loading: boolean
  error: string | null
  removeCase: (caseId: string) => Promise<void>
  refetch: () => void
}

export function useImportResults(importId: string): UseImportResultsReturn {
  const [cases, setCases] = useState<ImportedCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!importId) return

    let cancelled = false
    setLoading(true)
    setError(null)

    importService
      .getResults(importId)
      .then((res) => {
        if (!cancelled) {
          setCases(res.data)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar resultados')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [importId, tick])

  const removeCase = useCallback(
    async (caseId: string) => {
      await importService.removeCase(importId, caseId)
      setCases((prev) => prev.filter((c) => c.id !== caseId))
    },
    [importId]
  )

  const refetch = useCallback(() => {
    setTick((t) => t + 1)
  }, [])

  return { cases, loading, error, removeCase, refetch }
}
