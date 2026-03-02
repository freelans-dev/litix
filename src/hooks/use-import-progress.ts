'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ImportProgress {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  cases_found: number
  cases_imported: number
  cases_deduplicated: number
  error?: string | null
  started_at?: string | null
  completed_at?: string | null
}

export function useImportProgress(importId: string | null) {
  const [progress, setProgress] = useState<ImportProgress | null>(null)

  useEffect(() => {
    if (!importId) return
    const supabase = createClient()

    // Initial fetch
    supabase
      .from('oab_imports')
      .select('id, status, cases_found, cases_imported, cases_deduplicated, error, started_at, completed_at')
      .eq('id', importId)
      .single()
      .then(({ data }) => { if (data) setProgress(data as ImportProgress) })

    // Realtime subscription
    const channel = supabase
      .channel(`import-${importId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'oab_imports',
        filter: `id=eq.${importId}`,
      }, (payload) => {
        setProgress(payload.new as ImportProgress)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [importId])

  return progress
}
